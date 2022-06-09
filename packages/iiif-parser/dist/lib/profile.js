const anyRegionAndSizeFeatures = ['regionByPx', 'sizeByWh'];
function parseProfileUri(uri) {
    if (uri === 'http://iiif.io/api/image/2/level0.json') {
        return 0;
    }
    else if (uri === 'http://iiif.io/api/image/2/level1.json') {
        return 1;
    }
    else if (uri === 'http://iiif.io/api/image/2/level2.json') {
        return 2;
    }
    else {
        throw new Error('Unsupported IIIF Image Profile');
    }
}
function parseImage2ProfileDescription(parsedProfileDescription) {
    return {
        maxWidth: parsedProfileDescription.maxWidth,
        maxHeight: parsedProfileDescription.maxHeight,
        maxArea: parsedProfileDescription.maxArea,
        supportsAnyRegionAndSize: anyRegionAndSizeFeatures.every((feature) => parsedProfileDescription.supports &&
            parsedProfileDescription.supports.includes(feature))
    };
}
export function getProfileProperties(parsedImage) {
    if ('id' in parsedImage) {
        let supportsAnyRegionAndSize = false;
        if (parsedImage.profile === 'level0') {
            if (parsedImage.extraFeatures) {
                supportsAnyRegionAndSize = anyRegionAndSizeFeatures.every((feature) => parsedImage.extraFeatures &&
                    parsedImage.extraFeatures.includes(feature));
            }
        }
        else {
            supportsAnyRegionAndSize = true;
        }
        return {
            maxWidth: parsedImage.maxWidth,
            maxHeight: parsedImage.maxHeight,
            maxArea: parsedImage.maxArea,
            supportsAnyRegionAndSize
        };
    }
    else if ('@id' in parsedImage) {
        let supportsAnyRegionAndSize = false;
        let maxHeight = Number.NEGATIVE_INFINITY;
        let maxWidth = Number.NEGATIVE_INFINITY;
        let maxArea = Number.NEGATIVE_INFINITY;
        parsedImage.profile.forEach((profile) => {
            if (typeof profile === 'string') {
                const profileLevel = parseProfileUri(profile);
                supportsAnyRegionAndSize = supportsAnyRegionAndSize || profileLevel >= 1;
            }
            else {
                const { maxWidth: profileMaxWidth, maxHeight: profileMaxHeight, maxArea: profileMaxArea, supportsAnyRegionAndSize: profileSupportsAnyRegionAndSize } = parseImage2ProfileDescription(profile);
                if (profileMaxWidth !== undefined) {
                    maxWidth = Math.max(profileMaxWidth, maxWidth);
                }
                if (profileMaxHeight !== undefined) {
                    maxHeight = Math.max(profileMaxHeight, maxHeight);
                }
                if (profileMaxArea !== undefined) {
                    maxArea = Math.max(profileMaxArea, maxArea);
                }
                supportsAnyRegionAndSize =
                    supportsAnyRegionAndSize || profileSupportsAnyRegionAndSize;
            }
        });
        return {
            maxWidth: maxWidth >= 0 ? maxWidth : undefined,
            maxHeight: maxHeight >= 0 ? maxHeight : undefined,
            maxArea: maxArea >= 0 ? maxArea : undefined,
            supportsAnyRegionAndSize
        };
    }
    else {
        throw new Error('Invalid Image');
    }
}