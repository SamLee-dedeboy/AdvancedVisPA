
class VolView3d extends Canvas2dView
{
    constructor( parent ) 
    {
        super( "volView3d", parent );
    
        THREE.Object3D.DefaultUp = new THREE.Vector3(0,0,1);
        this.camera = new THREE.PerspectiveCamera( 30, this.canvas.width  / this.canvas.height , 0.01, 100 );
        this.camera.position.set( 0, -2.75, 0.0 );
        this.cameraControls = new THREE.TrackballControls( this.camera, this.canvas );  
        this.cameraControls.target.set( 0, 0, 0 );
        this.cameraControls.enablePan = true;
        this.cameraControls.staticMoving = true;

        this.lightPosX = new MyRangeSlider(
            "LightPositionControllerX",
            this.getSelector(),
            "X",
            0,
            255,
            1,
            this.getPosition().x,
            this.getPosition().y,
            200,
            50)
            .setHasBorder( false )
            .setColor("white")
            .setValue(0)

        this.lightPosY = new MyRangeSlider(
            "LightPositionControllerY",
            this.getSelector(),
            "Y",
            0,
            255,
            1,
            this.getPosition().x,
            this.lightPosX.getPosition().y + this.lightPosX.getSize().y,
            200,
            50)
            .setHasBorder( false )
            .setColor("white")
            .setValue(0)
        this.lightPosZ = new MyRangeSlider(
            "LightPositionControllerZ",
            this.getSelector(),
            "Z",
            0,
            255,
            1,
            this.getPosition().x,
            this.lightPosY.getPosition().y + this.lightPosY.getSize().y,
            200,
            50).setHasBorder( false )
            .setColor("white")
            .setValue(0)
        var c = document.querySelector( this.getSelector() );

        var colorPickerTitleElement = document.createElement("span");
        colorPickerTitleElement.textContent = "Color";
        colorPickerTitleElement.style.position = "relative";
        colorPickerTitleElement.style.color = "white";
        colorPickerTitleElement.style.left = this.lightPosZ.getPosition().x + 10 + "px";
        colorPickerTitleElement.style.top = this.lightPosZ.getPosition().y + this.lightPosZ.getSize().y + "px";
        var colorPickerElement = document.createElement("input");
        colorPickerElement.setAttribute("type", "color");
        colorPickerElement.setAttribute("id", "lightSourceColorPicker")
        colorPickerElement.value = "#ffffff";
        colorPickerElement.style.position = "relative";
        colorPickerElement.style.left = this.lightPosZ.getPosition().x + 20 + "px";
        colorPickerElement.style.top = this.lightPosZ.getPosition().y + this.lightPosZ.getSize().y + "px";
        colorPickerElement.style.width = 120 + "px";
        colorPickerElement.style.height = 30; + "px"
        c.append(colorPickerTitleElement);
        c.append(colorPickerElement);
        
        this.mouseDown = false;
        var self = this;

        
        this.lightPosX.getSlider().addEventListener('input', function(event) {
            c.dispatchEvent(new Event("changed"));
        }, false);
        this.lightPosY.getSlider().addEventListener('input', function(event) {
            c.dispatchEvent(new Event("changed"));
        }, false);
        this.lightPosZ.getSlider().addEventListener('input', function(event) {
            c.dispatchEvent(new Event("changed"));
        }, false);
        colorPickerElement.addEventListener("input", function(event) {
            c.dispatchEvent(new Event("changed"));
        }, false);
        this.canvas.addEventListener('mousedown', function (event) {
            self.mouseDown = true;    
        }, false);

        this.canvas.addEventListener('mouseup', function (event) {
            self.mouseDown = false;    
        }, false);

        this.canvas.addEventListener('mousemove', function (event) {
            if( self.mouseDown )
            {
                self.cameraControls.update();     
                c.dispatchEvent( new Event( "changed" ) );
            }
        }, false);

        this.canvas.addEventListener('wheel', function (event) {
            c.dispatchEvent( new Event( "changed" ) );
        }, false);

        return this;
    }
    setLightSource(dims) {
        this.lightPosX
        .setMin(-dims[0])
        .setMax(dims[0] * 2);

        this.lightPosY
        .setMin(-dims[1])
        .setMax(dims[1] * 2);

        this.lightPosZ
        .setMin(-dims[2])
        .setMax(dims[2] * 2);

    }
    hexToRGB(hex) {
		var r = parseInt(hex.slice(1, 3), 16),
			g = parseInt(hex.slice(3, 5), 16),
			b = parseInt(hex.slice(5, 7), 16);
	
			return [r/255,g/255,b/255, 1.0]
			//return "rgb(" + r + ", " + g + ", " + b + ")";
		
	}
    getLightColor() {
        var hexColor = document.getElementById("lightSourceColorPicker").value
        var color = this.hexToRGB(hexColor);
        return color
    }
    setSize( width, height )
    {
        super.setSize( width, height );
        this.camera.aspect = this.canvas.width / this.canvas.height;
        this.camera.updateProjectionMatrix();
        this.cameraControls.update();
        return this;
    }

    view()
    {
        this.cameraControls.update()
        return this.camera.matrixWorldInverse.toArray();
    }

    projection()
    {
        this.camera.updateProjectionMatrix();
        return this.camera.projectionMatrix.toArray();
    }

    dataSpaceToWorldSpace( dims )
    {
        var M = glMatrix.mat4.create();
        var maxDim = Math.max( Math.max( dims[ 0 ], dims[ 1 ] ), dims[ 2 ] );

        glMatrix.mat4.scale(     
            M, 
            M,
            [ 
                1.0 / maxDim, 
                1.0 / maxDim, 
                1.0 / maxDim 
            ] );

        glMatrix.mat4.translate( 
            M, 
            M,
            [ 
                -dims[ 0 ] / 2.0, 
                -dims[ 1 ] / 2.0, 
                -dims[ 2 ] / 2.0 
            ] );    

        return M;
    }

    worldSpaceToDataSpace( dims )
    {
        var D = glMatrix.mat4.clone( this.dataSpaceToWorldSpace( dims ) );
        glMatrix.mat4.invert( D, D );
        return D;
    }

    worldSpaceToClipSpace()
    {
        var V = this.view(); 
        var P = this.projection(); 

        var toClipSpace = glMatrix.mat4.create();

        glMatrix.mat4.mul( toClipSpace, toClipSpace, P );
        glMatrix.mat4.mul( toClipSpace, toClipSpace, V );

        return toClipSpace;
    }

    dataSpaceToClipSpace( dataDims )
    {
        var M = this.dataSpaceToWorldSpace( dataDims );
        var W = this.worldSpaceToClipSpace();

        var toClipSpace = glMatrix.mat4.create();

        glMatrix.mat4.mul( toClipSpace, toClipSpace, W );
        glMatrix.mat4.mul( toClipSpace, toClipSpace, M );

        return toClipSpace;
    }

    dataSpacePositionToWorldSpaceVector( dims, pos )
    {
        let toWorldSpace = this.dataSpaceToWorldSpace( dims );
        var posVector = glMatrix.vec4.fromValues( pos[ 0 ], pos[ 1 ], pos[ 2 ], 1.0 );
        glMatrix.vec4.transformMat4( posVector, posVector, toWorldSpace  );  
        return [ posVector[ 0 ], posVector[ 1 ], posVector[ 2 ] ];
    }

    dataSpacePositionToScreenSpacePos( dims, pos )
    {
        let toClipSpace = this.dataSpaceToClipSpace(dims);
        var posVector = glMatrix.vec4.fromValues(pos[0], pos[1], pos[2], 1.0);
        glMatrix.vec4.transformMat4(posVector, posVector, toClipSpace);
        return [
            this.getSize().x * ( (      posVector[0] / posVector[3]) + 1) / 2.0,
            this.getSize().y * ( ( -1 * posVector[1] / posVector[3]) + 1) / 2.0
        ];
    }

    getBBoxCorners( dims )
    {
        const A = [         0,         0,         0 ];
        const B = [ dims[ 0 ],         0,         0 ];
        const C = [         0, dims[ 1 ],         0 ];
        const D = [         0,         0, dims[ 2 ] ];
        const E = [ dims[ 0 ],         0, dims[ 2 ] ];

        const F = [ dims[ 0 ], dims[ 1 ],         0 ];
        const G = [         0, dims[ 1 ], dims[ 2 ] ];
        const H = [ dims[ 0 ], dims[ 1 ], dims[ 2 ] ];


       return [ A, B, C, D, E, F, G, H ];
    }

    getBoundingBoxGeometry( dims )
    {
        const corners = this.getBBoxCorners( dims );

        const A = corners[ 0 ]
        const B = corners[ 1 ]
        const C = corners[ 2 ]
        const D = corners[ 3 ]

        const E = corners[ 4 ]
        const F = corners[ 5 ]
        const G = corners[ 6 ]
        const H = corners[ 7 ]

        var lines = new Float32Array( [
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

                ].flat( 1 ) );

        return lines;
    }

    bboxCornersWorldSpace( dims )
    {
        var corners = this.getBBoxCorners( dims );
        for( var i = 0; i < corners.length; ++i )
        {
            corners[ i ] = this.dataSpacePositionToWorldSpaceVector( dims, corners[ i ] );
        }
        return corners;
    }

    getFacesGeometry( dims ) {
        const corners = this.getBBoxCorners( dims );
        const A = corners[ 0 ]
        const B = corners[ 1 ]
        const C = corners[ 2 ]
        const D = corners[ 3 ]

        const E = corners[ 4 ]
        const F = corners[ 5 ]
        const G = corners[ 6 ]
        const H = corners[ 7 ]
        var faces = new Float32Array([
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
        ].flat(1))
        return faces;
    }

    getBrickFacesGeometryDataSpace(brickSize, dims) {
        if(this.brickArray != null) return this.brickArray;
        this.brickArray = []
        //if(dims[0] % brickSize != 0 || dims[1] % brickSize != 0 || dims[2] % brickSize != 0) throw "brick size invalid to dims"
        for(var i = 0; i < Math.floor(dims[0] / brickSize); ++i) {
            for(var j = 0; j < Math.floor(dims[1] / brickSize); ++j) {
                for(var k = 0; k < Math.floor(dims[2] / brickSize); ++k) {
                    this.brickArray.push(this.getIndexedBrickFacesGeometryDataSpace(i, j, k, brickSize))
                    // this.brickArray.push(this.createCube(
                    //     i*brickSize, (i+1)*brickSize, 
                    //     j*brickSize, (j+1)*brickSize, 
                    //     k*brickSize, (k+1)*brickSize 
                    //     ))

                }
            }
        }
      
        return this.brickArray;
    }
    getBrickBoundingBoxGeometryDataSpace(brickSize, dims) {
        if(this.brickArray == null) this.getBrickFacesGeometryDataSpace(brickSize, dims);
        if(this.boundingBoxArray != null) return this.boundingBoxArray;
        this.boundingBoxArray = []
        for(var brickIndex = 0; brickIndex < this.brickArray.length; ++brickIndex) {
     
            this.boundingBoxArray.push(this.getIndexedBrickBoundingBoxGeometryDataSpace(brickIndex));        
            
        }
        //this.boundingBoxArray = new Float32Array(this.boundingBoxArray.flat(1));
        return this.boundingBoxArray;
    }
    createCube( 
        xMin, xMax,
        yMin, yMax,
        zMin, zMax )
    {
        // 3 values per vertex, 6 vertices per face, 6 faces
        var points = new Array( 3*6*6 );

        var corners = [  
            [ [ 0,0,0 ], [ 1,0,0 ], [ 1,0,1 ], [ 0,0,1 ] ],
            [ [ 1,0,0 ], [ 1,1,0 ], [ 1,1,1 ], [ 1,0,1 ] ],
            [ [ 1,1,0 ], [ 0,1,0 ], [ 0,1,1 ], [ 1,1,1 ] ],
            [ [ 0,1,0 ], [ 0,0,0 ], [ 0,0,1 ], [ 0,1,1 ] ],
            [ [ 0,0,1 ], [ 1,0,1 ], [ 1,1,1 ], [ 0,1,1 ] ],
            [ [ 0,1,0 ], [ 1,1,0 ], [ 1,0,0 ], [ 0,0,0 ] ]                                                          
        ];

        var faceOrder = [ 0, 1, 2, 0, 2, 3 ];

        var dx = xMax - xMin;
        var dy = yMax - yMin;
        var dz = zMax - zMin;

        for ( var f = 0; f < 6; ++f )
        {
            var faceOffset = 18*f;
            var c = corners[ f ];

            for( var i = 0; i < 6; ++i )
            {
                var vOffset = i * 3;
                points[ faceOffset + vOffset + 0  ] = xMin + c[ faceOrder[ i ] ][ 0 ] * dx;
                points[ faceOffset + vOffset + 1  ] = yMin + c[ faceOrder[ i ] ][ 1 ] * dy;
                points[ faceOffset + vOffset + 2  ] = zMin + c[ faceOrder[ i ] ][ 2 ] * dz;
            }
        }

        return points;
    }
    getIndexedBrickBoundingBoxGeometryDataSpace(brickIndex) {
        let brick = this.brickArray[brickIndex];

        const A = this.getBrickCornerFromFaces(brick, 0);
        const B = this.getBrickCornerFromFaces(brick, 1);
        const C = this.getBrickCornerFromFaces(brick, 6);
        const D = this.getBrickCornerFromFaces(brick, 5);
        const E = this.getBrickCornerFromFaces(brick, 2);
        const F = this.getBrickCornerFromFaces(brick, 8);
        const G = this.getBrickCornerFromFaces(brick, 10);
        const H = this.getBrickCornerFromFaces(brick, 7);
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
    getLightPositionDataSpace() {
        return [Math.round(this.lightPosX.getValue()), Math.round(this.lightPosY.getValue()), Math.round(this.lightPosZ.getValue())]
    }
    getLightPositionWorldSpace(dims) {
        var lightPos = this.getLightPositionDataSpace()
        
        lightPos = this.dataSpacePositionToWorldSpaceVector( dims, lightPos );
        
        return lightPos;
    }
    getAxisGeometry( dims, slicePositions )
    {
        var xAxis = new Float32Array( [
           -1,                               -1, -1, 
            dims[ 0 ] * slicePositions[ 0 ], -1, -1
        ] );

        var yAxis = new Float32Array( [
            -1,        -1,                       -1, 
            -1, dims[ 1] * slicePositions[ 1 ], -1
        ] );

        var zAxis = new Float32Array( [
            -1, -1,         -1, 
            -1, -1, dims[ 2 ] * slicePositions[ 2 ]
        ] );

        return {
            'x' : xAxis,
            'y' : yAxis,
            'z' : zAxis
        };
    }

    viewDirection()
    {
        var v = new THREE.Vector3();
        this.camera.getWorldDirection( v );
        return glMatrix.vec3.fromValues( 
            v.x,
            v.y,            
            v.z        
        );
    }

    up()
    {
        var up = this.camera.up;
        return glMatrix.vec3.fromValues( 
            up.x,
            up.y,            
            up.z        
        );
    }

    getCameraPosition()
    {
        var p = this.camera.position;
        return glMatrix.vec3.fromValues( 
            p.x,
            p.y,            
            p.z        
        );
    }
    getCamFrustumPlane() {
        return {
            near: this.camera.near,
            far: this.camera.far
        }
    }
}

