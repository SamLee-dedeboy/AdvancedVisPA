class SparseLeap {
    constructor(metadata, data) {
        this.occupancyHistogramTree = new OccupancyHistogramTree(metadata, data)
        this.visibilityOrderArray = [];
    }
    updateOccuClass(metadata, opacityTF) {
        this.occupancyHistogramTree.updateOccuClass(metadata, opacityTF);
    }
    updateOccupancyGeometry(metadata, opacityTF) {
        this.updateOccuClass(metadata, opacityTF);
        this.generateOccupancyHistogramTree(this.occupancyHistogramTree.root);
        this.boxUpdated = true;
        return this.generateOccupancyGeometry(this.occupancyHistogramTree.root);
    }
    getGeometryBoundingBox() {
        if(this.boundingBoxArray == null || this.boxUpdated) this.boundingBoxArray = this.occupancyHistogramTree.root.getBoundingBox();
        this.boxUpdated = false;
        //console.log(this.boundingBoxArray)
        return this.boundingBoxArray;
    }
    generateVisibilityOrder(cameraPosDataSpace) {
        //console.log(this.occupancyHistogramTree.root)
        this.visibilityOrderArray = [];
        this.cameraPosDataSpace = cameraPosDataSpace;
        // update visibilityOrderArray
        this.getTraversalIndex(this.occupancyHistogramTree.root);
        //console.log(this.visibilityOrderArray)
        return this.visibilityOrderArray;
    }
    getTraversalIndex(node) {
        if(node.isLeafNode) {
            if(node.emitIndex != -1) {
                this.visibilityOrderArray.push({
                    index: node.emitIndex,
                    type: 0 // 0 = front face, 1 = back face
                })
                this.visibilityOrderArray.push({
                    index: node.emitIndex,
                    type: 1 // 0 = front face, 1 = back face
                })
            }
        } else {
            if(node.emitIndex != -1) {
                this.visibilityOrderArray.push({
                    index: node.emitIndex,
                    type: 0 // 0 = front face, 1 = back face
                })
            }
            var distanceArray = this.getChildrenDistanceToCameraPlane(node.children);
            var sortedIndex = [0,1,2,3,4,5,6,7];
            sortedIndex.sort(function(a,b) {
                return distanceArray[a] - distanceArray[b];
            })
            for(var index = 0; index < 8; index++) {
                var childIndex = sortedIndex[index];
                this.getTraversalIndex(node.children[childIndex])
            }
            if(node.emitIndex != -1) {
                this.visibilityOrderArray.push({
                    index: node.emitIndex,
                    type: 1 // 0 = front face, 1 = back face
                })
            }
        }
        //console.log(this.visibilityOrderArray)
    }
    getChildrenDistanceToCameraPlane(children) {
        var distanceArray = [];
        let cameraPos = this.cameraPosDataSpace
        for(var i = 0; i < children.length; ++i) {
            var node = children[i];
            var distanceVec = glMatrix.vec3.fromValues(
                (node.startPoint[0] + node.endPoint[0])/2 - cameraPos[0],
                (node.startPoint[1] + node.endPoint[1])/2 - cameraPos[1],
                (node.startPoint[2] + node.endPoint[2])/2 - cameraPos[2],
            )
            var center = glMatrix.vec3.fromValues(
                (node.startPoint[0] + node.endPoint[0])/2,
                (node.startPoint[1] + node.endPoint[1])/2,
                (node.startPoint[2] + node.endPoint[2])/2,
            )
            var distance = glMatrix.vec3.length(distanceVec);
            distanceArray.push(distance);
        }
        return distanceArray;
    }
    generateOccupancyHistogramTree(node) {
        var emptyCount = 0;
        var nonEmptyCount = 0;
        for(var childIndex = 0; childIndex < node.children.length; ++childIndex) {
            var child = node.children[childIndex];
            if(child.isLeafNode) {
                if(child.occuClass == 0) emptyCount++;
                else nonEmptyCount++;
                continue;
            }
            var childHisrogram = this.generateOccupancyHistogramTree(child);
            emptyCount += childHisrogram.emptyCount;
            nonEmptyCount += childHisrogram.nonEmptyCount;
        }
        if(emptyCount < nonEmptyCount) {
            node.occuClass = 1;
        } else {
            node.occuClass = 0;
        }
        // node.setOccupancyHistogram({
        //     emptyCount: emptyCount,
        //     nonEmptyCount, nonEmptyCount
        // })
        node.occupancyHistogram = {
            emptyCount: emptyCount,
            nonEmptyCount: nonEmptyCount
        }
        return node.occupancyHistogram;
    }
    generateOccupancyGeometry(root) {
        this.boxGeometryArray = []
        this.boxTagsArray = []
        root.occuClass = 0;
        //this.boxGeometryArray.push(root.constructBoundingBoxFaces())
        this.boxGeometryArray.push([root.startPoint, root.endPoint])
        this.boxTagsArray.push([0,0])
        root.emitIndex = 0;
        var nextLayerArray = root.children;
        while(nextLayerArray.length != 0) {
            var thisLayerArray = nextLayerArray;
            nextLayerArray = [];
            for(var nodeIndex = 0; nodeIndex < thisLayerArray.length; nodeIndex++) {
                var curNode = thisLayerArray[nodeIndex];
                if(curNode.occuClass != curNode.parent.occuClass) {
                    //this.boxGeometryArray.push(curNode.constructBoundingBoxFaces());
                    this.boxGeometryArray.push([curNode.startPoint, curNode.endPoint])
                    this.boxTagsArray.push([curNode.occuClass,curNode.parent.occuClass])
                    curNode.emitIndex = this.boxGeometryArray.length-1;
                }
                if(!curNode.isLeafNode) nextLayerArray = nextLayerArray.concat(curNode.children)
            }
        }
        return {
            geometry: this.boxGeometryArray,
            occuClasses: this.boxTagsArray
        }
    }
}
