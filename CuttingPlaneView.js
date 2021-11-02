
class CuttingPlaneView extends Canvas2dView
{
	constructor( parent, orthogonalAxis ) 
	{
		super( "cuttingPlaneView", parent );

        this.sliceValue = 0.5;
		this.orthogonalAxis = orthogonalAxis;
		this.orthogonalPlane = new Float32Array(6*3)
		this.rotationMatrix = glMatrix.mat4.create()
		this.rotationMatrix.rad = 0
        var c = document.querySelector( this.getSelector() );

        var self = this;
        this.canvas.addEventListener('wheel', function (event) {
			event.preventDefault();
			var scale = -0.0001;
			if ( event.shiftKey ) {
			    scale = -0.00001;
			}
			self.sliceValue += event.deltaY * scale;
			self.sliceValue = Math.max( Math.min( self.sliceValue, 1.0 ), 0.0 );
			c.dispatchEvent( new Event( "changed" ) );

        }, false);

        this.checkBox = new CheckBox( 
        	this.getSelector(), 
        	"" ).setTransparency( 0.2 ).setColor( 'rgba( 0,255 , 255, 1)' );

        document.querySelector( this.checkBox.getSelector() ).addEventListener( 'changed', function( e ) {
			c.dispatchEvent( new Event( "changed" ) );
	    }, false );

		return this;
	}

	getAxisGeometry( dims )
	{
		return this.createAxisGeometry( dims );
	}

	getPlaneGeometry( dims )
	{
		return this.createPlaneGeometry( dims );
	}

	// TODO --- a quad 
	createPlaneGeometry( dims )
	{
		// make a quad to use for rendering cut planes
		var geom = new Float32Array( 6*3 );
        var slicePosition = this.sliceValue;
        if( this.orthogonalAxis == "x" )
        {
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
				// translate plane to make axis at thec enter
				var posVector = glMatrix.vec4.fromValues(geom[index]-dims[0]*slicePosition, geom[index+1], geom[index+2] - dims[2]/2, 1)
				
				//rotate
				glMatrix.vec4.transformMat4(posVector, posVector, this.rotationMatrix)
				
				// translate back
				geom[index] = posVector[0]+dims[0]*slicePosition
				geom[index+1] = posVector[1]
				geom[index+2] = posVector[2] + dims[2]/2
			}
        } 
        else if ( this.orthogonalAxis == "y" )
        {
			geom = new Float32Array([
				0, dims[1]*slicePosition, 0,
				dims[0], dims[1]*slicePosition, 0,
				0, dims[1]*slicePosition, dims[2],
				0, dims[1]*slicePosition, dims[2],
				dims[0], dims[1]*slicePosition, 0,
				dims[0], dims[1]*slicePosition, dims[2]
			])
			this.orthogonalPlane = [...geom]
			for(var index = 0; index < 6*3; index+=3) {
				// translate plane to make axis at thec enter
				var posVector = glMatrix.vec4.fromValues(geom[index], geom[index+1]-dims[1]*slicePosition, geom[index+2]-dims[2]/2, 1)
				
				// rotate 
				glMatrix.vec4.transformMat4(posVector, posVector, this.rotationMatrix)
				
				// translate back
				geom[index] = posVector[0]
				geom[index+1] = posVector[1]+dims[1]*slicePosition
				geom[index+2] = posVector[2]+dims[2]/2
			}
        }
        else // ( this.orthogonalAxis == "z" )
        {
			geom = new Float32Array([
				0, 0, dims[2]*slicePosition,
				dims[0], 0, dims[2]*slicePosition, 
				0, dims[1],  dims[2]*slicePosition,
				0, dims[1], dims[2]*slicePosition,
				dims[0], 0, dims[2]*slicePosition, 
				dims[0], dims[1], dims[2]*slicePosition
			])
			this.orthogonalPlane = [...geom]
			// rotate
			for(var index = 0; index < 6*3; index+=3) {
				// translate plane to make axis at the enter
				var posVector = glMatrix.vec4.fromValues(geom[index], geom[index+1]-dims[1]/2, geom[index+2]-dims[2]*slicePosition, 1)
				
				//rotate
				glMatrix.vec4.transformMat4(posVector, posVector, this.rotationMatrix)
				
				// translate back
				geom[index] = posVector[0]
				geom[index+1] = posVector[1]+dims[1]/2
				geom[index+2] = posVector[2]+dims[2]*slicePosition
			}
		} 
		

		
		return geom;
	}
	setRotatation(angle) {
		var unitLine = [0,0,0]
		if(this.orthogonalAxis == 'x') {
			unitLine = [0, 1, 0]
		} else if(this.orthogonalAxis == 'y') {
			unitLine = [1, 0, 0]
		} else if(this.orthogonalAxis == 'z') {
			unitLine = [1, 0, 0]
		}
		this.rotationMatrix = glMatrix.mat4.create();
		var rad = Math.PI*(angle/180)
		glMatrix.mat4.rotate(
			this.rotationMatrix,
			this.rotationMatrix,
			rad,
			unitLine
		)
		this.rotationMatrix.rad = rad
		return this.rotationMatrix
	}
	createAxisGeometry( dims )
	{
		let g = this.orthogonalPlane;
		return { 
			"u" : new Float32Array( [  
				g[ 0 ], g[ 1 ],  g[ 2 ],
				g[ 3 ], g[ 4 ],  g[ 5 ] ] ),

			"v" : new Float32Array( [
				g[ 0 ], g[ 1 ],  g[ 2 ],
				g[ 6 ], g[ 7 ],  g[ 8 ] ] ) };
	}

	// TODO --- the matrix to transform your planeGeometry into clip Space
	getClipSpaceTransform( dims, margin )
	{
		const w = this.orthogonalAxis;
		var M = glMatrix.mat4.create();
		var maxDim = Math.max( Math.max( dims[ 0 ], dims[ 1 ] ), dims[ 2 ] );
		glMatrix.mat4.translate( 
			M, 
			M,
			[ 
				margin/this.width, 
				margin/this.width, 
				margin/this.width
			] );   
		// rotate the plane accordingly since sliceView is always
		// looking on xy plane
		if(w == 'x') {
			glMatrix.mat4.rotate(
				M,
				M,
				-Math.PI/2,
				[0, 0, 1]
			)
			glMatrix.mat4.rotate(
				M,
				M,
				-Math.PI/2,
				[0, 1, 0]
			)
		} else if(w == 'y') {
			glMatrix.mat4.rotate(
				M,
				M,
				-Math.PI/2,
				[1, 0, 0]
			)
			
		} 
		glMatrix.mat4.scale(     
			M, 
			M,
			[ 
				2.0 / maxDim, 
				2.0 / maxDim, 
				2.0 / maxDim 
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

	setDataDims( dims )
	{
		this.dataDims = dims;
	}

	getIsLinked()
	{
		return this.checkBox.isChecked();
	}

	setSize( width, height )
	{
		super.setSize( width, height );
		this.checkBox.setPosition( this.width - this.checkBox.getSize().x - 2 );
	}

}