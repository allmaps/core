import { setContext, getContext } from 'svelte'

import ReconnectingWebSocket from 'reconnecting-websocket'
import Client from 'sharedb-client-browser/dist/sharedb-client-umd.cjs'
import { type as json1Type, insertOp, replaceOp, removeOp } from 'ot-json1'
import { throttle } from 'lodash-es'

import { generateId } from '@allmaps/id'

import {
  parseOperations,
  isInsertInstruction,
  isRemoveInstruction,
  isReplaceInstruction
} from '$lib/shared/json1-operations.js'
import { getGcps, isGcpComplete } from '$lib/shared/maps.js'
import { MapsEvents } from '$lib/shared/maps-events.js'

import { MapsEventTarget } from '$lib/shared/maps-events.js'

import type { SourceState } from '$lib/state/source.svelte'

import type {
  DbMap,
  DbMap2,
  DbMaps,
  DbGcp2,
  Point,
  InsertMap,
  RemoveMap,
  InsertResourceMaskPoint,
  ReplaceResourceMaskPoint,
  RemoveResourceMaskPoint,
  InsertGcp,
  ReplaceGcp,
  RemoveGcp
} from '$lib/shared/types.js'

// TODO: read from env
const API_URL = 'https://dev.api.allmaps.org'
const WS_API_URL = 'wss://dev.api.allmaps.org'

const MAPS_KEY = Symbol('maps')

export class MapsState extends MapsEventTarget {
  #rws: ReconnectingWebSocket
  #connection: Client.Connection

  #doc: ReturnType<Client.Connection['get']> | undefined

  #maps = $state.raw<DbMaps | undefined>()
  #connecting = false
  #connected = $state(false)

  #connectedImageId: string | undefined
  #imageId: string | undefined

  #sourceState: SourceState

  #activeMapId = $state<string | null>()
  #activeGcpIdPerMap = $state<Record<string, string>>({})

  #activeMap = $derived.by(() => {
    if (this.#maps && this.#activeMapId) {
      return this.#maps[this.#activeMapId]
    }
  })

  #activeGcpId = $derived.by(() => {
    if (this.#activeMapId) {
      const gcpId = this.#activeGcpIdPerMap[this.#activeMapId]
      if (gcpId && this.#isGcpIdValidForMapId(this.#activeMapId, gcpId)) {
        return gcpId
      }
    }
  })

  #activeGcp = $derived.by(() => {
    if (this.#maps && this.#activeMapId && this.#activeGcpId) {
      return this.#maps[this.#activeMapId].gcps[this.#activeGcpId]
    }
  })

  #incompleteGcps = $derived.by(() => {
    if (this.activeMap) {
      const gcps = getGcps(this.activeMap)
      return gcps.filter((gcp) => !isGcpComplete(gcp))
    }

    return []
  })

  #throttledConnectToImageId = throttle(this.#connectToImageId, 1000, {
    leading: true,
    trailing: true
  })

  constructor(sourceState: SourceState) {
    super()

    this.#sourceState = sourceState

    this.#rws = new ReconnectingWebSocket(WS_API_URL, [], {
      maxEnqueuedMessages: 0
    })

    Client.types.register(json1Type)

    this.#connection = new Client.Connection(this.#rws)

    $effect(() => {
      if (sourceState.activeImageId) {
        this.#imageId = sourceState.activeImageId

        // TODO: make sure info.json is loaded before connecting
        console.log('Make sure info.json is loaded', this.#imageId)

        if (!this.#connecting) {
          this.#connected = false
          this.#connecting = true
          this.#throttledConnectToImageId(this.#imageId)
        }
      }
    })
  }

  #connectToImageId(imageId: string) {
    if (this.#doc) {
      this.#doc.off('op', this.#handleRemoteOperation.bind(this))

      this.#doc.destroy(() => {
        this.#setDoc(imageId)
      })
    } else {
      this.#setDoc(imageId)
    }
  }

  async #setDoc(imageId: string) {
    this.#connectedImageId = imageId
    const allmapsImageId = await generateId(imageId)

    this.#doc = this.#connection.get('images', allmapsImageId)

    this.#doc.subscribe(this.#handleSnapshot.bind(this))
    this.#doc.on('op', this.#handleRemoteOperation.bind(this))
  }

  #handleSnapshot(err?: Error) {
    if (!this.#doc) {
      return
    }

    if (
      this.#imageId &&
      this.#sourceState.activeImageId &&
      this.#imageId !== this.#connectedImageId
    ) {
      this.#throttledConnectToImageId(this.#imageId)
      return
    }

    if (!this.#doc.type) {
      this.#doc.create({}, json1Type.name)
    }

    this.#maps = this.#doc.data
    this.#activeMapId = this.#maps ? Object.keys(this.#maps)[0] : undefined
    this.#activeGcpIdPerMap = {}

    this.#connected = true
    this.#connecting = false
  }

  #handleRemoteOperation(op: unknown, localOperation: boolean | any) {
    if (op) {
      this.#maps = this.#doc.data

      const operations = parseOperations(op)

      for (const { mapId, type, key, instruction } of operations) {
        if (type === 'map') {
          if (isInsertInstruction(instruction)) {
            // TODO: convert to DbMap2!
            // const map = instruction.i as DbMap
            const map = instruction.i as DbMap2

            const detail = {
              mapId,
              map
            }

            this.dispatchEvent(
              new CustomEvent<InsertMap>(MapsEvents.INSERT_MAP, { detail })
            )
          } else if (isRemoveInstruction(instruction)) {
            const detail = {
              mapId
            }

            this.dispatchEvent(
              new CustomEvent<RemoveMap>(MapsEvents.REMOVE_MAP, { detail })
            )
          }
        } else if (type === 'resourceMask') {
          const index = key

          if (typeof index !== 'number') {
            throw new Error('Resource mask point index must be a number')
          }

          if (isInsertInstruction(instruction)) {
            const point = instruction.i as Point

            const detail = {
              mapId,
              index,
              point
            }

            this.dispatchEvent(
              new CustomEvent<InsertResourceMaskPoint>(
                MapsEvents.INSERT_RESOURCE_MASK_POINT,
                { detail }
              )
            )
          } else if (isReplaceInstruction(instruction)) {
            const point = instruction.i as Point

            const detail = {
              mapId,
              index,
              point
            }

            this.dispatchEvent(
              new CustomEvent<ReplaceResourceMaskPoint>(
                MapsEvents.REPLACE_RESOURCE_MASK_POINT,
                { detail }
              )
            )
          } else if (isRemoveInstruction(instruction)) {
            const detail = {
              mapId,
              index
            }

            this.dispatchEvent(
              new CustomEvent<RemoveResourceMaskPoint>(
                MapsEvents.REMOVE_RESOURCE_MASK_POINT,
                { detail }
              )
            )
          } else {
            throw new Error('Invalid resource mask instruction')
          }
        } else if (type === 'gcps') {
          const gcpId = key

          if (typeof gcpId !== 'string') {
            throw new Error('GCP ID must be a string')
          }

          if (isInsertInstruction(instruction)) {
            // TODO: this is not always the case, can also be DbGcp1!
            const gcp = instruction.i as DbGcp2

            const detail = {
              mapId,
              gcpId,
              gcp
            }

            this.dispatchEvent(
              new CustomEvent<InsertGcp>(MapsEvents.INSERT_GCP, { detail })
            )
          } else if (isReplaceInstruction(instruction)) {
            // TODO: this is not always the case, can also be DbGcp1!
            const gcp = instruction.i as DbGcp2

            const detail = {
              mapId,
              gcpId,
              gcp
            }

            this.dispatchEvent(
              new CustomEvent<ReplaceGcp>(MapsEvents.REPLACE_GCP, { detail })
            )
          } else if (isRemoveInstruction(instruction)) {
            const detail = {
              mapId,
              gcpId
            }

            this.dispatchEvent(
              new CustomEvent<RemoveGcp>(MapsEvents.REMOVE_GCP, { detail })
            )
          }
        }
      }
    }
  }

  #isMapIdValid(mapId: string | null) {
    if (this.#maps && mapId && this.#connected) {
      return mapId in this.#maps
    }

    return false
  }

  #isGcpIdValidForMapId(mapId: string, gcpId: string) {
    if (this.#maps) {
      const map = this.#maps[mapId]

      if (map) {
        return gcpId in map.gcps
      }
    }

    return false
  }

  getMapById(mapId: string): DbMap | undefined {
    if (this.#maps) {
      return this.#maps[mapId]
    }
  }

  get activeMapId(): string | undefined {
    if (this.#activeMapId && this.#isMapIdValid(this.#activeMapId)) {
      return this.#activeMapId
    } else {
      const firstMapId = this.#maps ? Object.keys(this.#maps)[0] : undefined
      return firstMapId
    }
  }

  set activeMapId(mapId: string) {
    if (this.#isMapIdValid(mapId)) {
      this.#activeMapId = mapId
    }
  }

  get activeMap() {
    return this.#activeMap
  }

  get activeGcpId(): string | undefined {
    return this.#activeGcpId
  }

  set activeGcpId(gcpId: string) {
    if (this.#activeMapId) {
      this.#activeGcpIdPerMap[this.#activeMapId] = gcpId
    }
  }

  get activeGcp() {
    return this.#activeGcp
  }

  get incompleteGcps() {
    return this.#incompleteGcps
  }

  disconnect() {
    if (this.#doc) {
      this.#doc.removeListener('op', this.#handleRemoteOperation.bind(this))
      this.#doc.destroy()
    }

    this.#rws.close()
  }

  insertMap({ mapId, map }: InsertMap) {
    this.activeMapId = mapId
    this.#doc.submitOp(insertOp([mapId], structuredClone(map)))
  }

  removeMap({ mapId }: RemoveMap) {
    this.#doc.submitOp(removeOp([mapId]))
  }

  insertResourceMaskPoint({ mapId, index, point }: ReplaceResourceMaskPoint) {
    this.activeMapId = mapId
    this.#doc.submitOp(insertOp([mapId, 'resourceMask', index], point))
  }

  replaceResourceMaskPoint({ mapId, index, point }: ReplaceResourceMaskPoint) {
    this.activeMapId = mapId
    this.#doc.submitOp(replaceOp([mapId, 'resourceMask', index], true, point))
  }

  removeResourceMaskPoint({ mapId, index }: RemoveResourceMaskPoint) {
    this.activeMapId = mapId
    this.#doc.submitOp(removeOp([mapId, 'resourceMask', index], false))
  }

  insertGcp({ mapId, gcpId, gcp }: InsertGcp) {
    this.activeMapId = mapId
    this.activeGcpId = gcpId
    this.#doc.submitOp(insertOp([mapId, 'gcps', gcpId], gcp))
  }

  replaceGcp({ mapId, gcpId, gcp }: ReplaceGcp) {
    this.activeMapId = mapId
    this.activeGcpId = gcpId
    this.#doc.submitOp(replaceOp([mapId, 'gcps', gcpId], true, gcp))
  }

  removeGcp({ mapId, gcpId }: RemoveGcp) {
    this.activeMapId = mapId
    this.#doc.submitOp(removeOp([mapId, 'gcps', gcpId], false))
  }

  get connected() {
    return this.#connected
  }

  get maps() {
    if (this.#connected) {
      return this.#maps
    }
  }

  get connectedImageId() {
    return this.#connectedImageId
  }

  get mapsCount() {
    return this.maps ? Object.keys(this.maps).length : 0
  }
}

export function setMapsState(sourceState: SourceState) {
  return setContext(MAPS_KEY, new MapsState(sourceState))
}

export function getMapsState() {
  const mapsState = getContext<ReturnType<typeof setMapsState>>(MAPS_KEY)

  if (!mapsState) {
    throw new Error('MapsState is not set')
  }

  return mapsState
}
