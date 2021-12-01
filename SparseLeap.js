class SparseLeap {
    constructor(metadata, data, opacityTF) {
        this.occupancyHistogramTree = new OccupancyHistogramTree(metadata, data)
    }
    updateOccuClass(metadata, opacityTF) {
        this.occupancyHistogramTree.updateOccuClass(metadata, opacityTF);
    }
    updateOccupancyHistogramTree(metadata, opacityTF) {
        this.updateOccuClass(metadata, opacityTF);
        this.generateOccupancyHistogram(this.occupancyHistogramTree.root);
        return this.occupancyHistogramTree;
    }


    generateOccupancyHistogram(node) {
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
            var childHisrogram = this.generateOccupancyHistogram(child);
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
    getOccupancyGeometry() {
        
    }
}
