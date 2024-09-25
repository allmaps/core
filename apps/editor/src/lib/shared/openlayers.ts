import Feature, { type FeatureLike } from 'ol/Feature'
import { Geometry, Polygon, MultiPoint } from 'ol/geom'
import { shiftKeyOnly, singleClick } from 'ol/events/condition'
import { Fill, Stroke, Style, Text, Circle } from 'ol/style'
import { fromLonLat } from 'ol/proj'

import type { Coordinate } from 'ol/coordinate'
import type MapBrowserEvent from 'ol/MapBrowserEvent'

import { pink } from '@allmaps/tailwind'

import { getResourceMask } from '$lib/shared/maps.js'
import { transformResourceMaskToGeo } from '$lib/shared/transform.js'

import type { DbMap, ResourceMask } from '$lib/shared/types.js'

function polygonToResourceMask(coordinates: Coordinate[][]): ResourceMask {
  const resourceMask = coordinates[0]
    .slice(0, -1)
    .map((coordinate) =>
      [coordinate[0], -coordinate[1]].map((coordinate) =>
        Math.round(coordinate)
      )
    )

  return resourceMask as ResourceMask
}

export function getResourceMaskFromFeature(feature: Feature<Polygon>) {
  const coordinates = feature.getGeometry()?.getCoordinates()
  if (coordinates) {
    return polygonToResourceMask(coordinates)
  }
}

export function resourceMaskToPolygon(resourceMask: ResourceMask) {
  return [
    [
      ...resourceMask.map((coordinate) => [coordinate[0], -coordinate[1]]),
      [resourceMask[0][0], -resourceMask[0][1]]
    ]
  ]
}

export function deleteCondition(event: MapBrowserEvent<any>) {
  return shiftKeyOnly(event) && singleClick(event)
}

function resourceMaskTextStyle(feature: FeatureLike) {
  return new Text({
    scale: 1.5,
    text: resourceMaskLabel(feature),
    font: 'Geograph',
    fill: new Fill({ color: '#000' }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
    placement: 'point',
    justify: 'center',
    textBaseline: 'middle',
    overflow: true
  })
}

function resourceMaskLabel(feature: FeatureLike) {
  const properties = feature.getProperties()
  return `Map ${properties.index + 1}`
}

export function resourceMaskStyle(feature: FeatureLike) {
  const active = feature.getProperties().active || false
  const hasLabel = 'index' in feature.getProperties()

  return new Style({
    stroke: new Stroke({
      color: pink,
      width: active ? 5 : 2
    }),
    text: hasLabel ? resourceMaskTextStyle(feature) : undefined
  })
}

export function editableResourceMaskStyle(feature: FeatureLike) {
  const active = feature.getProperties().active || false

  return [
    resourceMaskStyle(feature),
    new Style({
      image: new Circle({
        radius: 4,
        stroke: new Stroke({
          color: pink,
          width: active ? 5 : 2
        }),
        fill: new Fill({
          color: 'white'
        })
      }),
      geometry: (feature: FeatureLike) => {
        const coordinates = (feature as Feature<Polygon>)
          ?.getGeometry()
          ?.getCoordinates()?.[0]
        if (coordinates) {
          return new MultiPoint(coordinates)
        }
      }
    })
  ]
}

export function gcpStyle(feature: FeatureLike) {
  const active = feature.getProperties().active || false

  return new Style({
    image: new Circle({
      radius: 4,
      stroke: new Stroke({
        color: pink,
        width: active ? 6 : 2
      }),
      fill: new Fill({
        color: pink
      })
    }),
    text: gcpTextStyle(feature)
  })
}

function gcpTextStyle(feature: FeatureLike) {
  return new Text({
    scale: 1.5,
    text: gcpLabel(feature),
    fill: new Fill({ color: '#000' }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
    offsetX: 14,
    offsetY: 14
  })
}

function gcpLabel(feature: FeatureLike) {
  const properties = feature.getProperties()
  return String(properties.index + 1)
}

export function getResourceMaskPolygon(map: DbMap): Polygon {
  return new Polygon(resourceMaskToPolygon(getResourceMask(map)))
}

export function getGeoMaskPolygon(map: DbMap): Polygon | undefined {
  try {
    const points = transformResourceMaskToGeo(map)
    const projectedPoints = points.map((point) => fromLonLat(point))

    const projectedPolygon = [
      [...projectedPoints, [projectedPoints[0][0], projectedPoints[0][1]]]
    ]

    return new Polygon(projectedPolygon)
  } catch (error) {
    // Error transforming resource mask to geo mask,
    // map probably does not have enough GCPs
    return
  }
}

export function makeFeatureActive(
  features: Feature<Geometry>[],
  id: string | undefined
) {
  features.forEach((feature) => {
    const featureId = feature.getId()
    if (id && featureId === id) {
      feature.setProperties({ active: true })
    } else {
      feature.setProperties({ active: false })
    }
  })
}
