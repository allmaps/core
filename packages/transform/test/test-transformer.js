import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  geometriesToFeatureCollection,
  convertGeometryToGeojsonGeometry
} from '@allmaps/stdlib'

import {
  expectToBeCloseToArrayArray,
  expectToBeCloseToArrayArrayArray
} from '../../stdlib/test/helper-functions.js'

import { GcpTransformer } from '../dist/index.js'

import { transformRectangleForwardToRectangles } from '../dist/shared/transform-helper-functions.js'

import { transformGcps6, gcps6, transformGcps7 } from './input/gcps-test.js'

describe('Transform LineString Forward To LineString, with maxDepth = 1', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should transform the lineString (without closing) and add some midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and input as GCP instead of TransformGCP', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.01,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(gcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.4230497784967655, 51.950815146974556],
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should give the same result as with input as TransformGCP`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Forward To LineString, with maxDepth = 1 and destinationIsGeographic = true', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.01,
    maxDepth: 1,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [4.388957777030093, 51.959084191571606],
    [4.392938913951547, 51.94062947962427],
    [4.425874493300959, 51.94172557475595],
    [4.420666790347598, 51.959985351835975]
  ]

  it(`should transform the lineString (without closing) and add no midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Backward To LineString of horizontal line, with destinationIsGeographic = true and maxDepth = 2', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(transformGcps7, 'polynomial')
  const input = [
    [10, 50],
    [50, 50]
  ]
  const output = [
    [31.06060606060611, 155.30303030303048],
    [80.91200458875993, 165.7903106766409],
    [133.1658635549907, 174.5511756850417],
    [185.89024742146262, 181.22828756380306],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should transform the lineString (without closing) and add two layers of midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Backward To LineString of vertical line, with destinationIsGeographic = true and maxDepth = 2', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 2,
    destinationIsGeographic: true
  }
  const transformer = new GcpTransformer(transformGcps7, 'polynomial')
  const input = [
    [50, 10],
    [50, 50]
  ]
  const output = [
    [258.3333333333333, 91.66666666666677],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should transform the lineString (without closing) and add no midpoints`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform LineString Backward To LineString from GeoJSON', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 2
  }
  const transformer = new GcpTransformer(transformGcps7, 'polynomial')
  const input = {
    type: 'LineString',
    coordinates: [
      [10, 50],
      [50, 50]
    ]
  }
  const output = [
    [31.06060606060611, 155.30303030303048],
    [80.91200458875993, 165.7903106766409],
    [133.1658635549907, 174.5511756850417],
    [185.89024742146262, 181.22828756380306],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should give the same result as transforming from lineString, and destinationIsGeographic should be set automatically`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform MultiPoint Backward To MultiPoint', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 2,
    destinationIsGeographic: true,
    inputIsMultiGeometry: true
  }
  const transformer = new GcpTransformer(transformGcps7, 'polynomial')
  const input = [
    [10, 50],
    [50, 50]
  ]
  const output = [
    [31.06060606060611, 155.30303030303048],
    [237.12121212121218, 185.60606060606085]
  ]

  it(`should recognise multi geometry and transform the points piecewise, not considering the input as lineString, and hence not add midpoints and ignore lineString options`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })
})

describe('Transform Polygon Forward To Polygon, with maxOffsetRatio very small', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 1000]
    ]
  ]
  const output = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.390889520773774, 51.94984430356657],
      [4.392938913951547, 51.94062947962427],
      [4.409493277493718, 51.94119110133424],
      [4.425874493300959, 51.94172557475595],
      [4.4230497784967655, 51.950815146974556],
      [4.420666790347598, 51.959985351835975],
      [4.404906205946158, 51.959549039424715]
    ]
  ]

  it(`should transform the polygon (without closing) and add midpoints everywhere, including between first and last point`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform Polygon Forward To GeoJSON Polygon, with maxOffsetRatio very small', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 1000]
    ]
  ]
  const output = {
    type: 'Polygon',
    coordinates: [
      [
        [4.388957777030093, 51.959084191571606],
        [4.390889520773774, 51.94984430356657],
        [4.392938913951547, 51.94062947962427],
        [4.409493277493718, 51.94119110133424],
        [4.425874493300959, 51.94172557475595],
        [4.4230497784967655, 51.950815146974556],
        [4.420666790347598, 51.959985351835975],
        [4.404906205946158, 51.959549039424715],
        [4.388957777030093, 51.959084191571606]
      ]
    ]
  }

  it(`should give the same result as transforming to polygon, but as GeoJSON Polygon and therefore closed`, () => {
    expect(
      transformer.transformForwardAsGeojson(input, transformOptions)
    ).to.deep.equal(output)
  })
})

describe('Transform unconformed Polygon Forward To Polygon, with maxOffsetRatio very small', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [
      [1000, 1000],
      [1000, 2000],
      [2000, 2000],
      [2000, 2000], // repetition
      [2000, 1000],
      [1000, 1000] // closed
    ]
  ]
  const output = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.390889520773774, 51.94984430356657],
      [4.392938913951547, 51.94062947962427],
      [4.409493277493718, 51.94119110133424],
      [4.425874493300959, 51.94172557475595],
      [4.4230497784967655, 51.950815146974556],
      [4.420666790347598, 51.959985351835975],
      [4.404906205946158, 51.959549039424715]
    ]
  ]

  it(`should accept this unconformed input too and give the same result as transforming to polygon`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform Polygon Backward To Polygon, with maxOffsetRatio very small', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.392938913951547, 51.94062947962427],
      [4.425874493300959, 51.94172557475595],
      [4.420666790347598, 51.959985351835975]
    ]
  ]
  const output = [
    [
      [1032.5263837176526, 992.2883187637146],
      [1045.0268036997886, 1489.293879156599],
      [1056.6257766352364, 1986.6566391349374],
      [1520.5132800975002, 1995.126987432735],
      [1972.2719445148632, 2006.6657102722945],
      [1969.4605377858998, 1507.0986848843686],
      [1957.822599920541, 1009.7982201488556],
      [1495.754239007751, 1000.8172824356742]
    ]
  ]

  it(`should transform the polygon (without closing) and add midpoints everywhere, including on between first and last point`, () => {
    expectToBeCloseToArrayArrayArray(
      transformer.transformBackward(input, transformOptions),
      output
    )
  })

  describe('Transform GeoJSONPolygon Backward To Polygon', async () => {
    const transformOptions = {
      maxOffsetRatio: 0.00001,
      maxDepth: 1
    }
    const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
    const input = {
      type: 'Polygon',
      coordinates: [
        [
          [4.388957777030093, 51.959084191571606],
          [4.392938913951547, 51.94062947962427],
          [4.425874493300959, 51.94172557475595],
          [4.420666790347598, 51.959985351835975],
          [4.388957777030093, 51.959084191571606]
        ]
      ]
    }
    const output = [
      [
        [1032.5263837176526, 992.2883187637146],
        [1045.038670070595, 1489.2938524267215],
        [1056.6257766352364, 1986.6566391349374],
        [1520.5146305339294, 1995.064826625076],
        [1972.2719445148632, 2006.6657102722945],
        [1969.4756718048366, 1507.0983522493168],
        [1957.822599920541, 1009.7982201488556],
        [1495.7555378955249, 1000.7599463685738]
      ]
    ]

    it(`should give the same result as transforming from polygon`, () => {
      expect(
        transformer.transformBackward(input, transformOptions)
      ).to.deep.equal(output)
    })
  })

  describe('Transform GeoJSONMultiPolygon Backward To Polygon', async () => {
    const transformOptions = {
      maxOffsetRatio: 0.00001,
      maxDepth: 1
    }
    const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
    const input = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [4.388957777030093, 51.959084191571606],
            [4.392938913951547, 51.94062947962427],
            [4.425874493300959, 51.94172557475595],
            [4.420666790347598, 51.959985351835975],
            [4.388957777030093, 51.959084191571606]
          ]
        ],
        [
          [
            [4.388957777030093, 51.959084191571606],
            [4.392938913951547, 51.94062947962427],
            [4.425874493300959, 51.94172557475595],
            [4.420666790347598, 51.959985351835975],
            [4.388957777030093, 51.959084191571606]
          ]
        ]
      ]
    }
    const output = [
      [
        [
          [1032.5263837176526, 992.2883187637146],
          [1045.038670070595, 1489.2938524267215],
          [1056.6257766352364, 1986.6566391349374],
          [1520.5146305339294, 1995.064826625076],
          [1972.2719445148632, 2006.6657102722945],
          [1969.4756718048366, 1507.0983522493168],
          [1957.822599920541, 1009.7982201488556],
          [1495.7555378955249, 1000.7599463685738]
        ]
      ],
      [
        [
          [1032.5263837176526, 992.2883187637146],
          [1045.038670070595, 1489.2938524267215],
          [1056.6257766352364, 1986.6566391349374],
          [1520.5146305339294, 1995.064826625076],
          [1972.2719445148632, 2006.6657102722945],
          [1969.4756718048366, 1507.0983522493168],
          [1957.822599920541, 1009.7982201488556],
          [1495.7555378955249, 1000.7599463685738]
        ]
      ]
    ]

    it(`should give the same result as transforming from geojson polygon`, () => {
      expect(
        transformer.transformBackward(input, transformOptions)
      ).to.deep.equal(output)
    })
  })
})

describe('Transform SVG string Backward To Polygon', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.00001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input =
    '<svg><polygon points="4.388957777030093,51.959084191571606 4.392938913951547,51.94062947962427 4.425874493300959,51.94172557475595 4.420666790347598,51.959985351835975" /></svg>'
  let output = [
    [
      [1032.5263837176526, 992.2883187637146],
      [1045.038670070595, 1489.2938524267215],
      [1056.6257766352364, 1986.6566391349374],
      [1520.5146305339294, 1995.064826625076],
      [1972.2719445148632, 2006.6657102722945],
      [1969.4756718048366, 1507.0983522493168],
      [1957.822599920541, 1009.7982201488556],
      [1495.7555378955249, 1000.7599463685738]
    ]
  ]
  output = geometriesToFeatureCollection(
    convertGeometryToGeojsonGeometry(output)
  )

  it(`should give the same result as transforming from geojson polygon`, () => {
    expect(
      transformer.transformSvgStringToGeojsonFeatureCollection(
        input,
        transformOptions
      )
    ).to.deep.equal(output)
  })
})

describe('Transform LineString Forward To LineString, with inverse returnDomain', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.01,
    maxDepth: 1,
    returnDomain: 'inverse'
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1500],
    [2000, 1000]
  ]

  it(`should give the same result as with normal returnDomain, but return the corresponding points in the source domain`, () => {
    expectToBeCloseToArrayArray(
      transformer.transformForward(input, transformOptions),
      output
    )
  })
})

describe('Transform Rectangle Forward To Rectangles', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'thinPlateSpline')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [
      [4.388957777030093, 51.959084191571606],
      [4.390889520773774, 51.94984430356657],
      [4.407069026480558, 51.95034509744362],
      [4.404906205946158, 51.959549039424715]
    ],
    [
      [4.392938913951547, 51.94062947962427],
      [4.409493277493718, 51.94119110133424],
      [4.407069026480558, 51.95034509744362],
      [4.390889520773774, 51.94984430356657]
    ],
    [
      [4.425874493300959, 51.94172557475595],
      [4.4230497784967655, 51.950815146974556],
      [4.407069026480558, 51.95034509744362],
      [4.409493277493718, 51.94119110133424]
    ],
    [
      [4.420666790347598, 51.959985351835975],
      [4.404906205946158, 51.959549039424715],
      [4.407069026480558, 51.95034509744362],
      [4.4230497784967655, 51.950815146974556]
    ]
  ]

  it(`should split the rectangle in four`, () => {
    expectToBeCloseToArrayArrayArray(
      transformRectangleForwardToRectangles(
        input,
        transformer,
        transformOptions
      ),
      output
    )
  })
})

describe('Transform Rectangle Forward To Rectangles, with polynomial transform', async () => {
  const transformOptions = {
    maxOffsetRatio: 0.001,
    maxDepth: 1
  }
  const transformer = new GcpTransformer(transformGcps6, 'polynomial')
  const input = [
    [1000, 1000],
    [1000, 2000],
    [2000, 2000],
    [2000, 1000]
  ]
  const output = [
    [
      [4.395266464181372, 51.96017747257062],
      [4.397082957501063, 51.941330961850724],
      [4.427315417304341, 51.94200296627793],
      [4.425498923984651, 51.96084947699783]
    ]
  ]

  it(`should not split the rectangle in four`, () => {
    expectToBeCloseToArrayArrayArray(
      transformRectangleForwardToRectangles(
        input,
        transformer,
        transformOptions
      ),
      output
    )
  })
})
