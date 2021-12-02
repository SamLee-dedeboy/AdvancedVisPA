const maxDepth = 1;
const brickSize = 16;

class Octree
{
    constructor(metaData, data)
    {
        this.init(metaData, data);
    }
    init(metaData, data) {
        //var endPoint = [metaData.dims[0]+1, metaData.dims[1]+1, metaData.dims[2]+1];
        this.root = new OctreeNode(null, [0,0,0], metaData.dims, 0, 0);
        //TODO: if dims is not power of 2
        this.dataMin = metaData.min
        this.dataMax = metaData.max
        this.brickMetaDataArray = this.constructBrickMetaData(data, metaData.dims);
        console.log(this.brickMetaDataArray)
        this.bfsArray = []
        //this.root.addChildren(this.root.startPoint, this.root.endPoint, metaData, data, opacityTF)
    }
    getRoot() {
        return this.root;
    }
    getBfsArray() {
        if(this.bfsArray == null && !this.nodeUpdated) return this.bfsArray
        this.bfsArray = []
        this.bfsArray.push({
            startPoint: this.root.startPoint,
            endPoint: this.root.endPoint,
            firstChildrenIndex: 1,
            occuClass: this.root.occuClass
        });
        var nextLayerArray = this.root.children;
        while(nextLayerArray.length != 0) {
            var thisLayerArray = nextLayerArray;
            nextLayerArray = [];
            for(var nodeIndex = 0; nodeIndex < thisLayerArray.length; ++nodeIndex) {
                var curNode = thisLayerArray[nodeIndex];
                if(!curNode.isLeafNode) {
                    nextLayerArray = nextLayerArray.concat(curNode.children)
                }
                var firstChildOffset = this.getchildrenCountBeforeIndex(thisLayerArray, nodeIndex)

                this.bfsArray.push({
                    startPoint: curNode.startPoint,
                    endPoint: curNode.endPoint,
                    firstChildrenIndex:     // 0 if is leaf node
                        curNode.isLeafNode? 0:this.bfsArray.length + firstChildOffset + thisLayerArray.length - nodeIndex,
                    occuClass: curNode.occuClass
                })
               
            }
        }
        return this.bfsArray
    }
    getchildrenCountBeforeIndex(nodeArray, index) {
        var sum = 0;
        for(var i = 0; i < index; ++i) {
            sum+=nodeArray[i].children.length;
        }
        return sum;
    }
    getBoundingBoxGeometry() {
        // output geometry of leaf nodes
        if(this.brickArray == null || this.boxUpdated) this.brickArray = this.root.getBoundingBox();
        this.boxUpdated = false;
        return this.brickArray;
    }
    getFacesGeometry() {
        if(this.boxFacesArray == null || this.faceUpdated) this.boxFacesArray = this.root.getBoxFaces();
        this.faceUpdated = false;
        console.log(this.boxFacesArray)
        return this.boxFacesArray;
    }
    updateOccuClass(metaData, opacityTF) {

        this.root.updateOccuClass(metaData, this.brickMetaDataArray, opacityTF);
        this.boxUpdated = true;
        this.faceUpdated = true;
        this.nodeUpdated = true;
    }
    // used to assign leaf node occupancy class
    constructBrickMetaData(data, dims) {
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
        var min = this.dataMax;
        var max = this.dataMin;
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
	
}
class OctreeNode
{
    constructor(parent, startPoint, endPoint, occuClass, depth) {
        this.parent = parent;
        this.startPoint = startPoint;
        this.endPoint = endPoint
        this.occuClass = occuClass  // 0 = empty, 1 = non-empty
        this.children = []
        this.isLeafNode = true;
        this.depth = depth;
        this.subdivision = [
            [0,0,0],
            [1,0,0],
            [0,1,0],
            [1,1,0],
            [0,0,1],
            [1,0,1],
            [0,1,1],
            [1,1,1]
        ]
    }

    addChildren(startPoint, endPoint, metaData, brickMetaDataArray, opacityTF) {
        this.children = []
        this.isLeafNode = false;
        //var emptyCount = 0;
        for(var i = 0; i < 8; ++i) {
            var subdivision = this.subdivision[i]
            var childBrickSize = [
                (endPoint[0]-startPoint[0])/2,
                (endPoint[1]-startPoint[1])/2,
                (endPoint[2]-startPoint[2])/2
            ]
            //console.log(childBrickSize)
            var childStartPoint = [
                startPoint[0] + childBrickSize[0]*subdivision[0], 
                startPoint[1] + childBrickSize[1]*subdivision[1],
                startPoint[2] + childBrickSize[2]*subdivision[2],
            ]
            var childEndPoint = [
                childStartPoint[0] + childBrickSize[0],
                childStartPoint[1] + childBrickSize[1],
                childStartPoint[2] + childBrickSize[2],
            ]
            var child = new OctreeNode(this, childStartPoint, childEndPoint, null, this.depth+1);
            child.assignOccuClass(childStartPoint, childEndPoint, metaData, brickMetaDataArray, opacityTF);
            //if(child.occuClass == 0) emptyCount++;
            this.children.push(child);
        }  
        //this.subdivide(emptyCount, metaData, data, opacityTF);
        
    }
    subdivide(emptyCount, metaData, brickMetaDataArray, opacityTF) {
        if(this.depth < maxDepth && emptyCount <= 2) {
            this.isLeafNode = false;
            for(var i = 0; i < this.children.length; ++i) {
                var child = this.children[i];
                if(child.occuClass == 1) { // child not empty 
                    child.addChildren(child.startPoint, child.endPoint, metaData, brickMetaDataArray, opacityTF);
                    var childEmptyCount = 0;
                    for(var childChildrenIndex = 0; childChildrenIndex < child.children.length; ++childChildrenIndex) {
                        //this.children[i].updateOccuClass(metaData, data, opacityTF);
                        if(child.children[childChildrenIndex].occuClass == 0) childEmptyCount++;
                    }
                    if(childEmptyCount == 8) {
                        child.children = [];
                        child.isLeafNode = true;
                    } else {
                        child.subdivide(childEmptyCount, metaData, brickMetaDataArray, opacityTF);    
                    }
                }
            }
        }
    }
    assignOccuClass(startPoint ,endPoint, metaData, brickMetaDataArray, opacityTF) {
        var dims = metaData.dims;
        let brickNum = {
            x: Math.floor(dims[0] / brickSize),
			y: Math.floor(dims[1] / brickSize),
			z: Math.floor(dims[2] / brickSize)
        };
        let brickStartIndex = [
            startPoint[0]/brickSize,
            startPoint[1]/brickSize,
            startPoint[2]/brickSize
        ]
        let brickEndIndex = [
            endPoint[0]/brickSize,
            endPoint[1]/brickSize,
            endPoint[2]/brickSize
        ]
        // init to empty
        this.occuClass = 0;
        // init brick Max & Min
        var brickMin = metaData.max;
        var brickMax = metaData.min;
        for(var i = brickStartIndex[0]; i < brickEndIndex[0]; i++) {
            for(var j = brickStartIndex[1]; j < brickEndIndex[1]; j++) {
                for(var k = brickStartIndex[2]; k < brickEndIndex[2]; k++) {
                    var brickIndex = i*brickNum.y*brickNum.z + brickNum.z * j + k;
                    
                    brickMin = brickMetaDataArray[brickIndex].brickMin;
                    brickMax = brickMetaDataArray[brickIndex].brickMax;

                    var empty = this.checkBrickEmpty(brickMin, brickMax, metaData , opacityTF)
                    if(!empty) {
                        this.occuClass = 1;
                        return;
                    }

                    // var dataIndex = i + j * dims[0] + k * dims[0] * dims[1]
                    // var dataValue = data[dataIndex]
                    // // update brick Max & Min
                    // if(dataValue < brickMin) brickMin = dataValue
                    // if(dataValue > brickMax) brickMax = dataValue

                    // // check data point is empty or not
                    // var normalizedData = (dataValue - metaData.min)/(metaData.max - metaData.min);
                    // var empty = (opacityTF[Math.floor(normalizedData * (opacityTF.length-1))] == 0)
                    // if(!empty) {
                    //     this.occuClass = 1;
                    //     // do not end function here because we still need to find out brick Min & Max
                    // }
                }
            }
        }
        
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
    // use brick Min & Max to decide occupancy class
    updateOccuClass(metaData, brickMetaDataArray, opacityTF) {
        this.assignOccuClass(this.startPoint, this.endPoint, metaData, brickMetaDataArray, opacityTF);
        
        if(this.occuClass == 1) { // current node is non-empty
            // check if need to subdivide
            var emptyCount = 0;
            this.addChildren(this.startPoint, this.endPoint,metaData,brickMetaDataArray,opacityTF)
            
            for(var i = 0; i < this.children.length; ++i) {
                if(this.children[i].occuClass == 0) emptyCount++;
            }
            if(emptyCount == 8) {
                this.children = [];
                this.isLeafNode = true;
            } else {
                this.subdivide(emptyCount, metaData, brickMetaDataArray, opacityTF);    
            }
            return;
        }           
    }
    getBoxFaces() {
        var occuClassArray = [];
        if(this.isLeafNode) {
            return {
                geometry: this.constructBoundingBoxFaces(),
                occuClassArray: [this.occuClass]
            }
        } else {
            var brickArray = [];
            for(var i = 0; i < this.children.length; ++i) {
                var childNode = this.children[i];
                var geometryWithOccuClass = childNode.getBoxFaces();
                brickArray.push(geometryWithOccuClass.geometry);
                occuClassArray.push(geometryWithOccuClass.occuClassArray);
            }
            return {
                geometry: brickArray.flat(1),
                occuClassArray: occuClassArray.flat(1)
            }
        }
    }
    // get bounding box of this node
    // if is leaf node, output directly
    // if is non-leaf node, combine bounding box of all children
    getBoundingBox() {
        var occuClassArray = [];
        if(this.isLeafNode) {
            return {
                geometry: this.constructBoundingBox(),
                occuClassArray: [this.occuClass]
            }
        } else {
            var brickArray = [];
            for(var i = 0; i < this.children.length; ++i) {
                var childNode = this.children[i];
                var geometryWithOccuClass = childNode.getBoundingBox();
                brickArray.push(geometryWithOccuClass.geometry);
                occuClassArray.push(geometryWithOccuClass.occuClassArray);
            }
            return {
                geometry: brickArray.flat(1),
                occuClassArray: occuClassArray.flat(1)
            }
        }
    }
    constructBoundingBoxFaces() {
        var corners = this.getCorners();
        const A = corners[0]
        const B = corners[1]
        const C = corners[2]
        const D = corners[3]
        const E = corners[4]
        const F = corners[5]
        const G = corners[6]
        const H = corners[7]
        var faces = [
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
        return faces;
    }
    constructBoundingBox() {
        var corners = this.getCorners();
        const A = corners[0]
        const B = corners[1]
        const C = corners[2]
        const D = corners[3]
        const E = corners[4]
        const F = corners[5]
        const G = corners[6]
        const H = corners[7]
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
        //console.log(lines)
        return lines;
    }
    getCorners() {
        var brickSize = [
            this.endPoint[0] - this.startPoint[0],
            this.endPoint[1] - this.startPoint[1],
            this.endPoint[2] - this.startPoint[2],
        ]
        //console.log(brickSize, this.endPoint, this.startPoint)
        return [
           this.addArrays(this.startPoint, [0,0,0]),
           this.addArrays(this.startPoint, [brickSize[0], 0, 0]),
           this.addArrays(this.startPoint, [0, brickSize[1], 0]),
           this.addArrays(this.startPoint, [0, 0, brickSize[2]]),
           
           this.addArrays(this.startPoint, [brickSize[0], 0, brickSize[2]]),
           this.addArrays(this.startPoint, [brickSize[0], brickSize[1], 0]),
           this.addArrays(this.startPoint, [0, brickSize[1], brickSize[2]]),
           this.addArrays(this.startPoint, [brickSize[0], brickSize[1], brickSize[2]]),
        ]
    }
    addArrays(a,b) {
        if(a.length != b.length) alert("adding arrays of different size")
        var c = [];
        for(var i = 0; i < a.length; ++i) {
            c.push(a[i]+b[i])
        }
        return c;
    }
}