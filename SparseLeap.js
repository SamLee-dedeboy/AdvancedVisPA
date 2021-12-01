class SparseLeap {
    constructor(metadata, data) {
        this.occupancyHistogramTree = new OccupancyHistogramTree(metadata, data)
    }
    updateOccuClass(metadata, opacityTF) {
        this.occupancyHistogramTree.updateOccuClass(metadata, opacityTF);
    }
    updateOccupancyGeometry(metadata, opacityTF) {
        this.updateOccuClass(metadata, opacityTF);
        this.generateOccupancyHistogramTree(this.occupancyHistogramTree.root);
        return this.generateOccupancyGeometry(this.occupancyHistogramTree.root);
    }


    generateOccupancyHistogramTree(node) {
        console.log(node)
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
        this.boxGeometryArray.push(root.constructBoundingBoxFaces())
        this.boxTagsArray.push([0,0])
        var nextLayerArray = root.children;
        while(nextLayerArray.length != 0) {
            var thisLayerArray = nextLayerArray;
            nextLayerArray = [];
            for(var nodeIndex = 0; nodeIndex < thisLayerArray.length; nodeIndex++) {
                var curNode = thisLayerArray[nodeIndex];
                if(curNode.occuClass != curNode.parent.occuClass) {
                    this.boxGeometryArray.push(curNode.constructBoundingBoxFaces());
                    this.boxTagsArray.push([curNode.occuClass,curNode.parent.occuClass])

                }
                if(!curNode.isLeafNode) nextLayerArray = nextLayerArray.concat(curNode.children)
            }
        }
        return {
            geometry: this.boxGeometryArray.flat(1),
            occuClasses: this.boxTagsArray.flat(1)
        }
    }
}
