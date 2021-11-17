# Additional Functionalities

## Early ray termination & empty space skipping
These two functionalities are quite simple, with each just one line of code:
```javascript
// empty space skipping
for i = 0 to NSample {
    ...
    opacity = ...
    // skip this sample point
    if(opacity == 0.0) continue;
    ...
}
```
```javascript
// early ray termination

// composite
dstAlpha += (1.0 - dstAlpha) * srcAlphaCorrected;
dstColor += (1.0 - dstAlpha) * srcColorCorrected;

if(1.0 - dstAlpha == 0.0) break;
```
In my final project, I plan to do empty space skipping described in:
`SparseLeap: Efficient Empty Space Skipping for Large-Scale Volume Rendering`, so I think I might as well do a simple one in this assignment. 

## Lighting
In A3 my lighting implementation is quite simple, with just a single fixed point light and 0 ambient light. Also, there's probably some hidden bugs in it. So I add more functionalities to it in this assignment. 
### 1. Implementation
In my previous lighting implementation, I didn't consider ambient light and and shininess of specular is always 1. Basically it's just: color = diffuse + specular, so the specular effect is pretty bright. 

Also, I did not make `lambertian` greater than 0, so it could be negative. That wasn't an issue in A3, because ultimately the negative numbers are in `fragColor`, which then become 0 in the compositing process provided by webgl. In A4 however we're doing the compositing ourself, so I have to account for that.

The implemention is from https://campuswire.com/c/G46B6B5FF/feed/65, with only minor changes. 

### 2. Light Color & Position
I set up light color in the code by:
```javascript
//  diffuse light color
vec3 Id = lightColor;

//  specular light color
vec3 Is = lightColor; 
...
```
Previsouly the lighting is just a fixed point light source. In this assignment I add some sliders to let user change light source position. The range is from `[-dim, 2*dim]`, so that light can be outside of bounding box.
Also, I put a color picker on the canvas to let user choose light color.
The light source position is indicated by a small square. 

Some of the effect screenshots:
![pics](pics/red%20light.png)

## Performance measuring
I made check boxes to switch between different methods. If `Ray-casting` is unchecked, `view aligned polygon` is used to render instead. To make the comparison more reasonable, I implement the same lighting model for both ray-casting and view aligned polygon methods. Note that only ray-casting implements pre-integration, so unchecking it under `view aligned polygon` mode won't change anything. 



The result can be summarized into this table:
|  | with lighting(fps) | without lighting(fps) |
| ----- | ----- | ----- |
| Ray-casting  | 118  | 134 |
| View-aligned Polygon | 17 | 67 |

## Bug fixing
Some bugs are pointed out in the scoring comments of A1 and A2, and I fixed them in this assignment. 

Including:

1. Mismatch between mouse position and selected bin in Histrogram View. I use the viewport implementation instead to fix this bug. So I set the histogram geometry in data space(using data values), and use `viewport` to set the canvas location. In `HistogramView.js`, `render2d()` is called in this way:
```javascript
this.render2d(
    // geomerty
    new Float32Array(lines), 
    // bounding box
    {
        xMin: this.model.xMin,
        yMin: this.model.yMin, 
        xMax: this.model.xMax, 
        yMax:this.model.yMax
    }, 
    // color
    [0,0,0,1], 
    // mode
    this.gl.TRIANGLES, 
    // viewport, to leave space for annotations & axis
    [
        this.barStartX, 
        this.barStartY, 
        this.canvasWidth() - this.barStartX,
        this.canvasHeight() - this.barStartY - this.barEndY
    ])
```

2. Some white lines seperate the color TF editor canvas into segments. I use `CreateLinearGradient` to fix this bug. Codes modified are in function `renderGradientFromBuffer()` in `TFView.js`.
  