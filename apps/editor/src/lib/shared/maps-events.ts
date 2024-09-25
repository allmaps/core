import type {
  InsertMap,
  RemoveMap,
  InsertResourceMaskPoint,
  ReplaceResourceMaskPoint,
  RemoveResourceMaskPoint,
  InsertGcp,
  ReplaceGcp,
  RemoveGcp
} from '$lib/shared/types.js'

export const MapsEvents = {
  INSERT_MAP: 'INSERT_MAP' as const,
  REMOVE_MAP: 'REMOVE_MAP' as const,
  INSERT_RESOURCE_MASK_POINT: 'INSERT_RESOURCE_MASK_POINT' as const,
  REPLACE_RESOURCE_MASK_POINT: 'REPLACE_RESOURCE_MASK_POINT' as const,
  REMOVE_RESOURCE_MASK_POINT: 'REMOVE_RESOURCE_MASK_POINT' as const,
  INSERT_GCP: 'INSERT_GCP' as const,
  REPLACE_GCP: 'REPLACE_GCP' as const,
  REMOVE_GCP: 'REMOVE_GCP' as const
}

interface MapsEventMap {
  INSERT_MAP: InsertMap
  REMOVE_MAP: RemoveMap
  INSERT_RESOURCE_MASK_POINT: InsertResourceMaskPoint
  REPLACE_RESOURCE_MASK_POINT: ReplaceResourceMaskPoint
  REMOVE_RESOURCE_MASK_POINT: RemoveResourceMaskPoint
  INSERT_GCP: InsertGcp
  REPLACE_GCP: ReplaceGcp
  REMOVE_GCP: RemoveGcp
}

interface IMapsEventTarget extends EventTarget {
  addEventListener<K extends keyof MapsEventMap>(
    type: K,
    listener: (event: CustomEvent<MapsEventMap[K]>) => void,
    options?: AddEventListenerOptions | boolean
  ): void

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener<K extends keyof MapsEventMap>(
    type: K,
    listener: (event: CustomEvent<MapsEventMap[K]>) => void,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void
}

export const MapsEventTarget = EventTarget as {
  new (): IMapsEventTarget
  prototype: IMapsEventTarget
}
