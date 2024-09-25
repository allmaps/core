import { setContext, getContext } from 'svelte'

const UI_KEY = Symbol('ui')

type PresetBaseMap = {
  label: string
  url: string
  attribution: string
  value: string
}

const presetBaseMaps: PresetBaseMap[] = [
  {
    label: 'ESRI World Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    value: 'esri-world-topo'
  },

  {
    label: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    // TODO: also add https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/12/1340/2108
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    value: 'esri-world-imagery'
  },
  {
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap',
    value: 'osm'
  }
]

export class UiState {
  #presetBaseMapIndex = $state(0)

  #presetBaseMaps = $state(presetBaseMaps)

  #userBaseMapUrl = $state<string | undefined>()
  #userGeoreferenceAnnotationUrl = $state<string | undefined>()

  get presetBaseMaps() {
    return this.#presetBaseMaps
  }

  get presetBaseMap(): PresetBaseMap {
    return presetBaseMaps[this.#presetBaseMapIndex % presetBaseMaps.length]
  }

  set presetBaseMap(presetBaseMapValue: string) {
    let index = presetBaseMaps.findIndex(
      (presetBaseMap) => presetBaseMap.value === presetBaseMapValue
    )

    if (index === -1) {
      index = 0
    }

    this.#presetBaseMapIndex = index
  }

  set presetBaseMapIndex(index: number) {
    this.#presetBaseMapIndex = index
  }

  get userBaseMapUrl(): string | undefined {
    return this.#userBaseMapUrl
  }

  set userBaseMapUrl(url: string) {
    this.#userBaseMapUrl = url
  }

  get userGeoreferenceAnnotationUrl(): string | undefined {
    return this.#userGeoreferenceAnnotationUrl
  }

  set userGeoreferenceAnnotationUrl(url: string) {
    this.#userGeoreferenceAnnotationUrl = url
  }
}

export function setUiState() {
  return setContext(UI_KEY, new UiState())
}

export function getUiState() {
  const uitState = getContext<ReturnType<typeof setUiState>>(UI_KEY)

  if (!uitState) {
    throw new Error('UiState is not set')
  }

  return uitState
}
