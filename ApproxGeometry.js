class ApproxGeometry {
    constructor(brickSize, metaData, data) {

        this.brickSize = brickSize;
        this.metaData = metaData;
        this.brickMetaDataArray = this.constructBrickMetaData(data, metaData.dims)
    }
    constructBrickMetaData(data, dims) {
        let brickSize = this.brickSize;
        let brickNum = {
            x: Math.floor(dims[0] / brickSize),
			y: Math.floor(dims[1] / brickSize),
			z: Math.floor(dims[2] / brickSize)
        };
        var brickMetaDataArray = []
        //if(dims[0] % brickSize != 0 || dims[1] % brickSize != 0 || dims[2] % brickSize != 0) throw "brick size invalid to dims"
        for(var i = 0; i < brickNum.x; ++i) {
            for(var j = 0; j < brickNum.y; ++j) {
                for(var k = 0; k < brickNum.z; ++k) {
                    var brickIndex = i*brickNum.y*brickNum.z + brickNum.z * j + k;
                    var brickMetaData = this.getBrickMetaData({x:i*brickSize, y:j*brickSize, z:k*brickSize}, brickSize, dims, data);
                    brickMetaDataArray.push(brickMetaData);
                }
            }
        }
        return brickMetaDataArray;
    }
    getBrickMetaData(startPoint, brickSize, dims, data) {
        var min = this.metaData.max;
        var max = this.metaData.min;
		for(var i = startPoint.x; i < startPoint.x + brickSize; ++i) {
			for(var j = startPoint.y; j < startPoint.y + brickSize; ++j) {
				for(var k = startPoint.z; k < startPoint.z + brickSize; ++k) {
                    var dataValue = data[Math.floor(i + j * dims[0] + k * dims[0] * dims[1])]
                    // update min max
                    if(dataValue < min) min = dataValue;
                    if(dataValue > max) max = dataValue;
                    
                }
			}
		}
		return {
            brickMin: min,
            brickMax: max
        }
	}
    getNonEmptyFacesGeometry(opacityTF) {
        var facesGeometry = this.getBrickFacesGeometryDataSpace();
        var boundingBoxGeometry = this.getBrickBoundingBoxGeometryDataSpace();
        let brickSize = this.brickSize
        var dims = this.metaData.dims;
		var tmp = [];
		var tmp4BoundingBox = [];
		var bricksLength = {
			x: Math.floor(dims[0] / brickSize),
			y: Math.floor(dims[1] / brickSize),
			z: Math.floor(dims[2] / brickSize)
		}
		for(var i = 0; i < bricksLength.x; i++) {
			for(var j = 0; j < bricksLength.y; j++) {
				for(var k = 0; k < bricksLength.z; k++) {
					var brickIndex = i*bricksLength.y*bricksLength.z + bricksLength.z * j + k;
					
                    var brickMetadata = this.brickMetaDataArray[brickIndex]
                    var empty = this.checkBrickEmpty(brickMetadata.brickMin, brickMetadata.brickMax, this.metaData, opacityTF);
					
					if(!empty) {
						tmp.push(facesGeometry[brickIndex])
						tmp4BoundingBox.push(boundingBoxGeometry[brickIndex])
					} 
				}
			}
		}
		return [tmp.flat(1), tmp4BoundingBox.flat(1)];		
	}
	checkBrickEmpty(brickMin, brickMax, metaData, opacityTF) {
        var samplePointNum = 100;
        var offset = (brickMax - brickMin)/samplePointNum;
        for(var s = 0; s < samplePointNum; ++s) {
            var dataValue = brickMin + offset*s;
            var normalizedData = (dataValue - metaData.min)/(metaData.max - metaData.min);
            var empty = (opacityTF[Math.floor(normalizedData * (opacityTF.length-1))] == 0)
            if(!empty) return false;
        }
        return true;


	}
    
    getBrickFacesGeometryDataSpace() {
        if(this.brickFacesArray != null) return this.brickFacesArray;
        this.brickFacesArray = []
        let brickSize = this.brickSize
        var dims = this.metaData.dims;
        //if(dims[0] % brickSize != 0 || dims[1] % brickSize != 0 || dims[2] % brickSize != 0) throw "brick size invalid to dims"
        for(var i = 0; i < Math.floor(dims[0] / brickSize); ++i) {
            for(var j = 0; j < Math.floor(dims[1] / brickSize); ++j) {
                for(var k = 0; k < Math.floor(dims[2] / brickSize); ++k) {
                    this.brickFacesArray.push(this.getIndexedBrickFacesGeometryDataSpace(i, j, k, brickSize))
                    // this.brickArray.push(this.createCube(
                    //     i*brickSize, (i+1)*brickSize, 
                    //     j*brickSize, (j+1)*brickSize, 
                    //     k*brickSize, (k+1)*brickSize 
                    //     ))

                }
            }
        }
        console.log(this.brickFacesArray)
        return this.brickFacesArray;
    }
    getBrickBoundingBoxGeometryDataSpace() {
        if(this.brickFacesArray == null) this.getBrickFacesGeometryDataSpace();
        if(this.boundingBoxArray != null) return this.boundingBoxArray;
        this.boundingBoxArray = []
        for(var brickIndex = 0; brickIndex < this.brickFacesArray.length; ++brickIndex) {
            
            this.boundingBoxArray.push(this.getIndexedBrickBoundingBoxGeometryDataSpace(brickIndex));        
            
        }
        //this.boundingBoxArray = new Float32Array(this.boundingBoxArray.flat(1));
        return this.boundingBoxArray;
    }
    
    getIndexedBrickBoundingBoxGeometryDataSpace(brickIndex) {
        let brick = this.brickFacesArray[brickIndex];

        const A = this.getBrickCornerFromFaces(brick, 0);
        const B = this.getBrickCornerFromFaces(brick, 2);
        const C = this.getBrickCornerFromFaces(brick, 6);
        const D = this.getBrickCornerFromFaces(brick, 4);
        const E = this.getBrickCornerFromFaces(brick, 1);
        const F = this.getBrickCornerFromFaces(brick, 7);
        const G = this.getBrickCornerFromFaces(brick, 11);
        const H = this.getBrickCornerFromFaces(brick, 8);
        var lines = [
            A,B,
            A,C,
            A,D,
            B,E,
            B,F,
            C,F,
            C,G,
            D,E,
            D,G,
            E,H,
            F,H,
            G,H

        ].flat(1);

        return lines;
    }
    getBrickCornerFromFaces(brick, start) {
        return [brick[start*3], brick[start*3+1], brick[start*3+2]]
    }
    getIndexedBrickFacesGeometryDataSpace(i, j, k, brickSize) {
        const A = this.getBrickCornerDataSpace(i, j, k, brickSize);
        const B = this.getBrickCornerDataSpace(i+1, j, k, brickSize)
        const C = this.getBrickCornerDataSpace(i, j+1, k, brickSize);
        const D = this.getBrickCornerDataSpace(i, j, k+1, brickSize);

        const E = this.getBrickCornerDataSpace(i+1, j, k+1, brickSize);
        const F = this.getBrickCornerDataSpace(i+1, j+1, k, brickSize);
        const G = this.getBrickCornerDataSpace(i, j+1, k+1, brickSize);
        const H = this.getBrickCornerDataSpace(i+1, j+1, k+1, brickSize);

        var geometry = [
             // xz, y=0
             A, E, B,
             A, D, E,
             // xz, y=1
             C, F, H,
             C, H, G,
 
             // xy, z=0
             C, A, F,
             F, A, B,
             // xy, z=1
             D, G, E,
             E, G, H,
             
             // yz, x=0
             C, G, A,
             A, G, D,
             // yz, x=1
             B, E, F,
             F, E, H
        ].flat(1)
        return geometry;

    }
    getBrickCornerDataSpace(i, j, k, brickSize) {
        return [i*brickSize, j*brickSize, k*brickSize];
    }
}