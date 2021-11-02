# Additional Functionalites

## 1. Rotate CuttingPlanes
In addition to translating the cutting planes, I impletment rotation on the planes. The user interaction is simple: by dragging the slider above volume view. The range of the slider is from 0 to 360 in degree(since it's not easy to present radians in text). 

The rotation is done by rotating the plane geometry. In `createPlaneGeometry(dims)`, after constructing the orthogonal plane geometry, the geometry is multiplied by a `rorationMatrix`, and the rotated plane geometry will be used in shader programs. I notice that rotation can also be done in shader program, which will probably be faster since it uses gpu. But the performance difference is not significant, so I just choose the simpler implementation. 
```javascript
// CuttingPlaneView.js
if( this.orthogonalAxis == "x" )
{
    // construct orthogonal plane geometry
    geom = new Float32Array([
        dims[0]*slicePosition, 0, 0,
        dims[0]*slicePosition, dims[1], 0,
        dims[0]*slicePosition, 0, dims[2],
        dims[0]*slicePosition, 0, dims[2],
        dims[0]*slicePosition, dims[1], 0,
        dims[0]*slicePosition, dims[1], dims[2]
    ])
    this.orthogonalPlane = [...geom]
    for(var index = 0; index < 6*3; index+=3) {
        // translate plane to make axis at the center
        var posVector = glMatrix.vec4.fromValues(geom[index]-dims[0]*slicePosition, geom[index+1], geom[index+2] - dims[2]/2, 1)
        
        // rotate
        glMatrix.vec4.transformMat4(posVector, posVector, this.rotationMatrix)
        
        // translate back
        geom[index] = posVector[0]+dims[0]*slicePosition
        geom[index+1] = posVector[1]
        geom[index+2] = posVector[2] + dims[2]/2
    }
} 
```
In the code above, before multiplying the `posVector`(represents a point in the plane geometry) with `rotationMatrix`, the point needs to be translated to make the center of the plane sit on one of the x/y/z axis. That's because the `rotationMatrix` is constructed with `glMatrix.mat4.rotate`, which can only rotates around x/y/z axis. However, I want the plane to rotate around it's center. So I first translate the plane so that its center is on the axis, rotate it, and translate it back to where it was. 

Technically, you can rotate the plane in two different directions. For example, x plane can be rotated around y axis or z axis. To make things simpler, the plane will always rotate around the herizonal axis in Slice View. So x plane will be rotated around y axis, y plane will be rotated around x axis, z plane will be rotated around x axis. I make the axis color of x/y/z to be r/g/b to make it easier to remember. 

## 2. Caching Histogram
In Assignment 1, I add a slider for user to choose the number of bins they want for the histogram. Problem is, since everytime the number of bins is changed, histogramModel needs to be recalculated, and it would traverse through raw data. If the data is too big(which is often the case), there would be a performance issue. 

In Assignment 2 we use 3d texture, so it occured to me that I can pre-calculate all the possible models(from nBins.min to nBins.max) and store the models as a 3d texture, or an array of 2d texture. 

However, the pre-calculate process simply takes too long. In the end, I had to keep the previous implementation, which calculates a new model everytime there's new input on slider. To optimize this process, I store the calculated model in an array, so next time it won't need to be calculated again. Still, calculating the model for datasets that's too big will take a long time, like `CTHead.dat` or `christmas_tree.dat`, but it should work pretty well on `vortices_t83.dat` and `mouse.dat`.