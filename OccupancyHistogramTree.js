class OccupancyHistogramTree extends Octree {
    constructor(metaData, data) {
        super(metaData, data);
    }
    init(metaData, data) {
        this.root = new OccupancyHistogramTreeNode(null, [0,0,0], metaData.dims, 0, 0);
        //TODO: if dims is not power of 2
        this.dataMin = metaData.min
        this.dataMax = metaData.max
        this.brickMetaDataArray = this.constructBrickMetaData(data, metaData.dims);
        this.bfsArray = []
        //this.root.addChildren(this.root.startPoint, this.root.endPoint, metaData, data, opacityTF)
    }
}

class OccupancyHistogramTreeNode extends OctreeNode {
    constructor(parent, startPoint, endPoint, occuClass, depth) {
        super(parent, startPoint, endPoint, occuClass, depth);
        this.occupancyHistogram = {
            emptyCount: 0,
            nonEmptyCount: 0
        };
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
            var child = new OccupancyHistogramTreeNode(this, childStartPoint, childEndPoint, null, this.depth+1);
            child.assignOccuClass(childStartPoint, childEndPoint, metaData, brickMetaDataArray, opacityTF);
            //if(child.occuClass == 0) emptyCount++;
            this.children.push(child);
        }  
    }
}