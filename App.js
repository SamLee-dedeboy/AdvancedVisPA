
function parseMetadata( text )
{
	var lines = text.split( '\n' );
	return {
		"format" : lines[ 0 ].replace(/\r/g,''),
		"dims"   : lines[ 1 ].split( ' ' ).map( Number ),		
		"name"   : lines[ 2 ].replace(/\r/g,''),
	}
}

class App extends Widget {

	applyLayout()
	{
		var windowWidth  = window.innerWidth;
		var windowHeight = window.innerHeight;

		const yStart = 50;
		const minPanelWidth = 174;
		const maxPanelWidth = windowWidth - 400;

		this.axisCheckBox.setPosition( 
			windowWidth - this.axisCheckBox.getSize().x - this.margin*2,
			this.margin );

		this.bbCheckBox.setPosition( 
			this.axisCheckBox.getPosition().x - this.bbCheckBox.getSize().x - this.margin*2,
			this.margin );

		this.annoCheckBox.setPosition( 
			this.bbCheckBox.getPosition().x - this.annoCheckBox.getSize().x - this.margin*2,
			this.margin );

		this.lightingCheckBox.setPosition( 
			this.annoCheckBox.getPosition().x - this.lightingCheckBox.getSize().x - this.margin*2,
			this.margin );

		this.volumeCheckBox.setPosition( 
			this.lightingCheckBox.getPosition().x - this.volumeCheckBox.getSize().x - this.margin*2,
			this.margin );

		this.preIntegrateCheckBox.setPosition( 
			this.volumeCheckBox.getPosition().x - this.preIntegrateCheckBox.getSize().x - this.margin*2,
			this.margin );

		this.rayCastingCheckBox.setPosition( 
			this.preIntegrateCheckBox.getPosition().x - this.rayCastingCheckBox.getSize().x - this.margin*2,
			this.margin );
		this.panelWidth = Math.min( Math.max( 
			this.resizeHandle.getPosition().x - this.margin*2,
			minPanelWidth ), maxPanelWidth );

	    this.resizeHandle
			.setPosition( this.panelWidth + this.margin * 2, yStart )
			.setSize( 10, windowHeight - yStart )
			.setZ( 10 );

		this.setSize( windowWidth, windowHeight );
		this.setPosition( 0, 0 );

	    this.metaInput
	    	.setPosition( this.margin, this.margin );

	    this.volumeInput
	    	.setPosition( this.margin, this.margin );

	    this.metaDataView
	    	.setPosition( this.margin, yStart )
	    	.setSize( this.panelWidth, 90 );

	    this.histogramView
	        .setPosition( this.margin, this.metaDataView.getPosition().y + this.metaDataView.getSize().y + this.margin*2 )
	        .setSize( this.panelWidth, 160 );
		this.nBinSlider
		.setPosition( this.margin +  this.nBinSlider.width/5, this.histogramView.getPosition().y + this.histogramView.getSize().y + this.margin)
		.setSize(RangeSliderStyle.sliderWidth, 30)
		.setHasBorder(true)

	    this.TFView.setSize( this.panelWidth );
	    this.TFView.setPosition( 
	    	this.margin, 
	    	this.nBinSlider.getPosition().y + this.nBinSlider.getSize().y + this.margin*2 );	    

	    let viewSpacing = 1;

	    let xOffset = this.panelWidth + this.margin*2 + 11;
	    let yOffset = this.metaDataView.getPosition().y;

	    let volSpaceX = windowWidth - ( this.panelWidth + this.margin*3 + 11 );
	    let volSpaceY = windowHeight - this.metaDataView.getPosition().y - this.margin;

		var sliceHeight = ( volSpaceY - viewSpacing * 2 ) / 3.0;
		var sliceWidth = sliceHeight;

	    this.sliceViewX
	    	.setPosition( xOffset + volSpaceX - sliceWidth, yOffset + viewSpacing + sliceHeight )
	    	.setSize( sliceWidth, sliceHeight );

	    this.sliceViewY
	    	.setPosition(  xOffset + volSpaceX - sliceWidth, yOffset + viewSpacing * 2 + sliceHeight * 2 )
	    	.setSize( sliceWidth, sliceHeight );

	    this.sliceViewZ
	    	.setPosition(  xOffset + volSpaceX - sliceWidth, yOffset )
	    	.setSize( sliceWidth, sliceHeight );

	    this.volView3d
	    	.setPosition(  xOffset, yOffset )
	    	.setSize( volSpaceX - sliceWidth - viewSpacing, volSpaceY );

		return this;
	}

	renderBoundingBox3d( view, lines, MVP , occuClassArray = null)
	{
		console.log(occuClassArray)
		//occuClassArray = null
		if(occuClassArray == null) {
			this.VolRenderer.render( 
				view.getSize().x, 
				view.getSize().y, 
				lines, 
				MVP,
				[ 0.7, 0.7, 0.7, 1.0 ],
				this.VolRenderer.gl.LINES,
				2.0 ); 
		} else {
			// non-empty lines
			for(var i = 0; i < lines.length/(3*12*2); ++i) {
				if(occuClassArray[i] == 1) {
					var startIndex = i*3*12*2;
					var endIndex = startIndex + 3*12*2;
					var subArray = lines.slice(startIndex, endIndex+1)
					this.VolRenderer.render( 
						view.getSize().x, 
						view.getSize().y, 
						subArray, 
						MVP,
						[ 0.7, 0.7, 0.7, 1.0 ],
						this.VolRenderer.gl.LINES,
						2.0 
					); 
				}	
			}
			// empty lines
			for(var i = 0; i < lines.length/(3*12*2); ++i) {
				if(occuClassArray[i] == 0) {
					//console.log("empty lines!", lines)
					var startIndex = i*3*12*2;
					var endIndex = startIndex + 3*12*2;
					var subArray = lines.slice(startIndex, endIndex+1)
					this.VolRenderer.render( 
						view.getSize().x, 
						view.getSize().y, 
						subArray, 
						MVP,
						[ 1, 0, 0, 1.0 ],
						this.VolRenderer.gl.LINES,
						2.0 
					); 
				}	
			}
		}
	}

	renderAxis3d( view, toClipSpace, dx, dy, dz )
	{
	    var dims = this.metadata.dims; 
	    var axisGeometries = view.getAxisGeometry( dims,  [dx, dy, dz] );

		this.VolRenderer.render( 
			view.getSize().x, 
			view.getSize().y, 
			axisGeometries.x, 
			toClipSpace,
			this.xAxisColor,
			this.VolRenderer.gl.LINES,
			2.0 ); 

		this.VolRenderer.render( 
			view.getSize().x, 
			view.getSize().y, 
			axisGeometries.y, 
			toClipSpace,
			this.yAxisColor,
			this.VolRenderer.gl.LINES,
			2.0 ); 

		this.VolRenderer.render( 
			view.getSize().x, 
			view.getSize().y, 
			axisGeometries.z, 
			toClipSpace,
			this.zAxisColor,
			this.VolRenderer.gl.LINES,
			2.0 ); 
	}

	renderSliceView( view )
	{
		this.VolRenderer.clear( this.volBackgroundColor[ 0 ], this.volBackgroundColor[ 1 ], this.volBackgroundColor[ 2 ] ,  view.getSize().x,  view.getSize().y );		
		
		var dims = this.metadata.dims;

		let toClipSpace   = view.getClipSpaceTransform( dims, 4.0 );
		let planeGeometry = view.getPlaneGeometry( dims );

		this.VolRenderer.renderCuttingSurface( 
			view.getSize().x, 
			view.getSize().y, 
			planeGeometry, 
			toClipSpace,
			dims );

		if( this.axisCheckBox.isChecked() )
		{
			var axisGeometry = view.getAxisGeometry( dims );
		    let uc, vc;

	        // uv = yz plane
		    if( view.orthogonalAxis == "x" )
		    {
	            uc = this.yAxisColor;
	            vc = this.zAxisColor;
		    }  
	        // uv = xz plane		    
		    else if( view.orthogonalAxis == "y" )
		    {
	            uc = this.xAxisColor;
	            vc = this.zAxisColor;
		    }
	        // uv = xy plane			    
		    else // orth axis is z
		    {
		    	uc = this.xAxisColor;
	            vc = this.yAxisColor;
		    }

		    this.VolRenderer.disableDepthTest();

		    this.VolRenderer.render( 
				view.getSize().x, 
				view.getSize().y, 
				axisGeometry.u, 
				toClipSpace,
				uc,
				this.VolRenderer.gl.LINES, 
				2.0 ); 

		    this.VolRenderer.render( 
				view.getSize().x, 
				view.getSize().y, 
				axisGeometry.v, 
				toClipSpace,
				vc,
				this.VolRenderer.gl.LINES, 
				2.0 ); 
		
		    this.VolRenderer.enableDepthTest();
		}

	    view.render( this.VolRenderer.getCanvas() );

	    if( this.annoCheckBox.isChecked() )
	    {
		    var dim = view.orthogonalAxis == "x" ? 0 : view.orthogonalAxis == "y" ? 1 : 2;
		    view.renderText( 
		    	view.orthogonalAxis + "=" + ( view.sliceValue * this.metadata.dims[ dim ] ).toFixed(2), 
		    	'rgba(255, 255, 255, 0.5 )',
		    	[ 40, 20 ] );
	    }
	}

	renderVolView( view )
	{
		this.VolRenderer.clear(  
			this.volBackgroundColor[ 0 ], 
			this.volBackgroundColor[ 1 ], 
			this.volBackgroundColor[ 2 ] ,  
			view.getSize().x,  
			view.getSize().y );

		var dims = this.metadata.dims;
		var toClipSpace = view.dataSpaceToClipSpace( dims );
		
		var dx = this.sliceViewX.sliceValue;
		var dy = this.sliceViewY.sliceValue;
		var dz = this.sliceViewZ.sliceValue;

		let MVP = view.dataSpaceToClipSpace( dims );

		if ( this.volumeCheckBox.isChecked() )
		{
			this.VolRenderer.setTransparent3DRenderState();
			
			// this.VolRenderer.renderTextureBasedVolume( 
			// 	view.getSize().x, 
			// 	view.getSize().y, 
 			//     view.getCameraPosition(),
 			// 	view.up(),
 			// 	view.bboxCornersWorldSpace( dims ),
 			// 	view.worldSpaceToClipSpace( dims ),
 			// 	view.worldSpaceToDataSpace( dims ),
 			// 	dims,
			// 	this.lightingCheckBox.isChecked(), 
			// 	0.5 );
	
			if(this.rayCastingCheckBox.isChecked()) {
				let brickSize = 16;
				var skipMode = 3; // 0 = no, 1 = approx, 2 = octree, 3 = sparseLeap
				if(this.tfChanged) {
					if(skipMode == 1) {
						if(this.approxGeo == null) {
							this.approxGeo = new ApproxGeometry(brickSize, {dims: dims, min: this.dataMin, max: this.dataMax}, this.data);
						} 

						let nonEmptyCulling = this.approxGeo.getNonEmptyFacesGeometry(this.opcTfData)
						this.nonEmptyGeometry = new Float32Array(nonEmptyCulling[0])
						this.nonEmptyBoundingBox = new Float32Array(nonEmptyCulling[1])
						this.tfChanged = false;	
						console.log("get new geometry", this.nonEmptyGeometry.length)
						
						// let brickBoundingBoxGeo = view.getBrickBoundingBoxGeometryDataSpace(brickSize, dims)
						// let nonEmptyCulling = this.VolRenderer.getNonEmptyFacesGeometry(view.getBrickFacesGeometryDataSpace(brickSize, dims), brickSize, dims, brickBoundingBoxGeo)
						// this.nonEmptyGeometry = nonEmptyCulling[0]
						// this.nonEmptyBoundingBox = nonEmptyCulling[1]
						// this.tfChanged = false;	
						// console.log("get new geometry", this.nonEmptyGeometry.length)
					} else if(skipMode == 2) {
						if(this.octree == null) {
							this.octree = new Octree
							(
								{dims: dims, min: this.dataMin, max: this.dataMax},
								this.data,
							)
						} 
						this.octree.updateOccuClass({dims: dims, min: this.dataMin, max: this.dataMax},this.opcTfData);
						
						console.log("get new octree!", this.octree.root);

						var octreeBoxGeoWithOccuClass = this.octree.getBoundingBoxGeometry()
						//console.log(octreeBoxGeoWithOccuClass)
						this.nonEmptyBoundingBox = new Float32Array(octreeBoxGeoWithOccuClass.geometry.flat(1));
						this.boxOccuClass = octreeBoxGeoWithOccuClass.occuClassArray;
						//console.log(octreeBoundingBoxGeo)
						let octreeFacesGeoWithOccuClass = this.octree.getFacesGeometry();
						this.nonEmptyGeometry = new Float32Array(octreeFacesGeoWithOccuClass.geometry.flat(1));
						this.boxOccuClass = octreeFacesGeoWithOccuClass.occuClassArray;
						this.tfChanged = false;	
						this.bfsArray = this.octree.getBfsArray();
					} else if(skipMode == 3) {
						if(this.sparseLeap == null) {
							this.sparseLeap = new SparseLeap
							(
								{dims: dims, min: this.dataMin, max: this.dataMax},
								this.data,
							)	
						} 
						this.occupancyGeometry = this.sparseLeap.updateOccupancyGeometry({dims: dims, min: this.dataMin, max: this.dataMax},this.opcTfData);
						var occuGeoBoxWithOccuClass = this.sparseLeap.getGeometryBoundingBox()
						this.nonEmptyBoundingBox = new Float32Array(occuGeoBoxWithOccuClass.geometry);
						this.boxOccuClass = occuGeoBoxWithOccuClass.occuClassArray;
						console.log("get new occupancy histogram geometry", this.occupancyGeometry)
						this.tfChanged = false;	

					}
					
				}
				this.renderBoundingBox3d(view, this.nonEmptyBoundingBox, toClipSpace, this.boxOccuClass);
				//console.log(view.getCameraPosition())
				if(skipMode == 3) {
					this.visibilityOrderArray = this.sparseLeap.generateVisibilityOrder(view.getCameraPositionDataSpace(dims))
				}
				this.VolRenderer.renderRayCastingVolume( 
					view.getSize().x, 	
					view.getSize().y, 
					view.getCameraPosition(),
					skipMode,
					this.nonEmptyGeometry,
					this.bfsArray,
					this.visibilityOrderArray,
					this.occupancyGeometry,
					view.getFacesGeometry(dims),
					MVP,
					 view.worldSpaceToClipSpace( dims ),
					 view.worldSpaceToDataSpace( dims ),
					view.dataSpaceToWorldSpace( dims ),
					 dims,
					this.lightingCheckBox.isChecked(), 
					this.preIntegrateCheckBox.isChecked(),
					view.getLightPositionWorldSpace(dims),
					view.getLightColor(),
					1 );
				this.renderBoundingBox3d(view, this.nonEmptyBoundingBox, toClipSpace, this.boxOccuClass);

			} else {
				this.VolRenderer.renderViewAlignedCuttingPlanes( 
					view.getSize().x, 
					view.getSize().y, 
					view.getCameraPosition(),
					view.up(),
					view.bboxCornersWorldSpace( dims ),
					view.worldSpaceToClipSpace( dims ),
					view.worldSpaceToDataSpace( dims ),
					dims,
					this.lightingCheckBox.isChecked(), 
					view.getLightPositionWorldSpace(dims),
					view.getLightColor(),
					0.25 );
			}
		}

		if( this.bbCheckBox.isChecked() )
		{
			this.renderBoundingBox3d( view, view.getBoundingBoxGeometry( dims ), toClipSpace );
		    this.VolRenderer.disableDepthTest();
		}

		if( this.axisCheckBox.isChecked() )
		{
			this.renderAxis3d( view, toClipSpace, dx, dy, dz );
		}
		
		this.VolRenderer.enableDepthTest();
		this.VolRenderer.setOpaque3DRenderState();
		for( var i = 0; i < this.sliceViews.length; ++i )
		{
			continue;
			let sv = this.sliceViews[ i ];
			if( sv.getIsLinked() )
			{
				this.VolRenderer.renderCuttingSurface( 
					view.getSize().x, 
					view.getSize().y, 
					sv.getPlaneGeometry( dims ), 
					MVP,
					this.metadata.dims );
			}
		}
		
		
		this.VolRenderer.renderLightSource(
			view.getSize().x,
			view.getSize().y,
			new Float32Array(view.getLightPositionDataSpace()),
			MVP,
			view.getLightColor(),
			this.VolRenderer.gl.POINTS,
			10.0
		)
		view.clear();
	    view.render( this.VolRenderer.getCanvas() );	
		// if( this.lightingCheckBox.isChecked() ) {
			
		// 	view.renderText(	
		// 		"light" ,
		// 		'rgb(255,255,255)',
		// 		view.dataSpacePositionToScreenSpacePos(dims, new Float32Array(view.getLightPositionDataSpace()))
		// 	)
		// }
		if( this.annoCheckBox.isChecked()  )
		{
            var ds = [ dx,   dy,  dz ];
            var lb = [ "X=", "Y=", "Z=" ];            
            for( var i = 0; i < 3; ++i )
            {
            	var pos = [ -10, -10, -10 ];
             	pos[ i ] = dims[ i ] * ds[ i ];
	            view.renderText( 
	            	lb[ i ] + ( dims[ i ] * ds[ i ] ).toFixed( 2 ), 
	            	'rgb( 255, 255, 255 )', 
	            	view.dataSpacePositionToScreenSpacePos( dims, pos ) );
           
	            if( this.bbCheckBox.isChecked() )
	            {
             	    pos[ i ] = dims[ i ];	            	
		            view.renderText( 
		            	"" + ( dims[ i ] ).toFixed( 2 ), 
		            	'rgb( 255, 255, 255 )', 
		            	view.dataSpacePositionToScreenSpacePos( dims, pos ) );
	        	}
            }
			view.renderText( 
				"(0,0,0)", 
				'rgb( 255, 255, 255 )', 
				view.dataSpacePositionToScreenSpacePos( dims, [ -10, -10, -10 ] ) );      
			                
		}
		// for(var cornerIndex = 0; cornerIndex < bboxCornersDataSpace.length; cornerIndex++) {
		// 	view.renderText(
		// 		"v" + cornerIndex,
		// 		'rgb(255,255,255)',
		// 		view.dataSpacePositionToScreenSpacePos(dims, bboxCornersDataSpace[cornerIndex])
		// 	)
		// }
		 
	
	}

	updateAll()
	{
		if(!this.init) {
			this.VolRenderer.setTF( this.colTfData, this.opcTfData );
			this.TFView.setColorTF( "default", this.colTfData, this.opcTfData );
			this.TFView.setOpacityTF("default", this.opcTfData)
			this.init = true
		}
	    if( !( this.readMetadata && this.readBinary ) )
	    {
	    	return;
		}
		

		this.histogramView.render();
		this.TFView.renderHistogram(this.histogramView.getCanvas())
		this.renderSliceView( this.sliceViewZ );		
		this.renderSliceView( this.sliceViewX );
		this.renderSliceView( this.sliceViewY );
		this.renderVolView(   this.volView3d  );
	}

	begin()
	{
		this.histogramModelList = new Array(this.nBinSlider.getMax()+1).fill(0)

		var histModel = new HistogramModel( this.data, this.nBinSlider.value );
		this.histogramModelList[this.nBinSlider.value] = histModel
		this.histogramView.set( histModel );

        // TODO, get min and max of data, maybe from histogram model
		this.dataMin = histModel.xMin;
		this.dataMax = histModel.xMax;
	
		this.VolRenderer.setData( 
			this.data, 
			this.metadata.dims, 
			this.convertToFloat == true ? "FLOAT" : this.metadata.format, 
			this.dataMin,  
			this.dataMax );
		this.volView3d.setLightSource(this.metadata.dims);
		this.updateAll();
	}

	constructor()
	{
		super( 'Assignment1', 'body' );

		// data structures /////////////////////////////////////

	    this.data = null; 

	    this.convertToFloat = true;

	    this.metadata = {
	    	"dims"   : null,
	    	"format" : null,
	    	"name"   : null
	    };

	    this.viewAlignedPolygone = new Float32Array( 18 );

	    this.colTfData = {}
	    this.colTfName = "Default";

	    // state ////////////////////////////////////////////////

	    this.readBinary   = false;
	    this.readMetadata = false;
		this.tfChanged = true;
	    // properties //////////////////////////////////////////

		this.margin = 10;
		this.panelWidth = 470;

		// Views/Widgets /////////////////////////////////////////

        this.axisCheckBox = new CheckBox( 
        	'body', 
        	"axis" );

        this.bbCheckBox = new CheckBox( 
        	'body', 
        	"b-box" );

        this.annoCheckBox = new CheckBox( 
        	'body', 
        	"annotation" );

        this.lightingCheckBox = new CheckBox( 
        	'body', 
        	"Lighting" );

        this.volumeCheckBox = new CheckBox( 
        	'body', 
        	"volume" );
		this.preIntegrateCheckBox = new CheckBox( 
			'body', 
			"Pre-Integrate" );
		this.rayCastingCheckBox = new CheckBox( 
			'body', 
			"Ray-Casting" );
        this.metaInput = new FileInput( 
        	this.id + "_fileIn", 
        	'body', 
        	"Load HDR File" );

        this.volumeInput = new FileInput( 
        	this.id + "_fileIn", 
        	'body', 
        	"Load Data File" ).setHidden( true );

		this.metaDataView = new MetaDataView( 
			'MetaDataView', 
			this.getSelector(), 
			[ "name", "dims", "format" ], 
			"Dataset Information" );

	    this.histogramView = new HistogramView( 
	    	'HistogramView', 
	    	this.getSelector() )
	    	.setBkgColor( 250, 250, 250 )
	        .setStyle( HistogramStyles.default );

	    this.resizeHandle = new Widget( 
	    	'pannelDragger', 
	    	this.getSelector() )
			.setDragable( true, false )
			.setPosition( this.panelWidth, 0 )
			.setZ( 20 );
		this.nBinSlider = new MyRangeSlider(
			'nBinSlider', 
			this.getSelector(),
			"nBins"
			);
		this.histogramModelList = new Array(this.nBinSlider.getMax()+1).fill(0)
	    this.TFView = new TFView( "TFView", "body", 0, 0, this.panelWidth, 300 );

	    // Volume Views 

		this.volBackgroundColor = [ 0.1, 0.1, 0.1 ];

		// this.xAxisColor = [ 238 / 255.0, 136 / 255.0, 102 / 255.0, 1.0 ];
		// this.yAxisColor = [  68 / 255.0, 187 / 255.0, 150 / 255.0, 1.0 ];
		// this.zAxisColor = [ 119 / 255.0, 170 / 255.0, 221 / 255.0, 1.0 ];
		this.xAxisColor = [ 1.0 , 0.0, 0.0, 1.0 ];
		this.yAxisColor = [  0.0, 1.0, 0.0, 1.0 ];
		this.zAxisColor = [ 0.0 , 0.0, 1.0, 1.0 ];

	    this.sliceViewZ = new CuttingPlaneView( "body", "z" );
	    this.sliceViewX = new CuttingPlaneView( "body", "x" );
	    this.sliceViewY = new CuttingPlaneView( "body", "y" );

	    this.sliceViews = [ 
	    	this.sliceViewX,
	    	this.sliceViewZ,	    	 
	    	this.sliceViewY ];	

	    this.volView3d = new VolView3d( "body" );

		// volume renderer

		this.VolRenderer = new VolRenderer();

	    // default tf

	    const N_VALS = 64;
	    var defaultColorTF   = new Float32Array( N_VALS * 3 );
	    var defaultOpacityTF = new Float32Array( N_VALS );	    
	    
	    for( var i = 0; i < N_VALS; ++i )
	    {
	    	//defaultOpacityTF[ i ] = ( i /  ( N_VALS * 2.0 ) );// * ( i / N_VALS );
			defaultOpacityTF[ i ] = 0
	    	const s = i / N_VALS;

	    	defaultColorTF[ i*3 + 0 ] = 1.0 - 1 / ( Math.exp( s * 4 ) );
	    	defaultColorTF[ i*3 + 1 ] = 1.0 - 1 / ( Math.exp( s * 4 ) );
	    	defaultColorTF[ i*3 + 2 ] = 1.0 - 1 / ( Math.exp( s * 4 ) );	
	    }
	    this.colTfData = defaultColorTF;
		this.opcTfData = defaultOpacityTF
	    // listeners //////////////////////////////////////////////////////////////////////////////

	    var self = this;
		self.nBinSlider.getSlider().addEventListener('input', function(e) {
			if(self.readBinary == true) {
				if(self.histogramModelList[this.value] == 0) {
					var newModel = new HistogramModel(self.data, this.value)
					self.histogramView.set(newModel)
					self.histogramModelList[this.value] = newModel;
				} else {
					self.histogramView.set(self.histogramModelList[this.value])
				}
				self.histogramView.render()
				self.TFView.renderHistogram(self.histogramView.getCanvas())
			}
		})
		window.addEventListener(
			'resize', 
			function() { 
				self.applyLayout();
				if( self.data === null )
				{
					return;
				}
				self.updateAll(); 
			},
			false );

	    this.metaInput.getInputElement().addEventListener( 'change', function( e ) {
	        var reader = new FileReader();
	        reader.readAsText( e.target.files[ 0 ] );
	        reader.onload = function() {
	            
	            self.metadata = parseMetadata( reader.result );
	            
	            self.readMetadata = true;
	            self.readBinary = false;        
	            
	            self.metaInput.setHidden( true );
	            self.volumeInput.setHidden( false );

			    self.metaDataView.set( self.metadata );
	        }
	    }, false );

	    this.volumeInput.getInputElement().addEventListener( 'change', function( e ) {

	    	if( ! self.readMetadata )
	    	{
	    		return;
	    	}

	        var file = e.target.files[ 0 ];
	        var reader = new FileReader();
	        reader.readAsArrayBuffer( file );

	        reader.onload = function() {
				console.log(self.metadata)
	        	if( self.metadata.format == "FLOAT" )
	        	{
	            	self.data = new Float32Array( reader.result );
	        	}
	        	else if( self.metadata.format == "SHORT" )
	        	{
	        	    var dataIn = new Uint16Array( reader.result );
	        		if( self.convertToFloat )
	        		{
		            	self.data = new Float32Array( dataIn.length );
		            	for( var i = 0; i < dataIn.length; ++i )
		            	{
	 	            		self.data[ i ] = dataIn[ i ] / Math.pow( 2, 16 ) - 1;
		            	}
	           		}
	           		else
	           		{
	           			self.data = dataIn;
	           		}
		            self.metadata.format = "SHORT";
	        	}
				else if( self.metadata.format == "BYTE" )
				{
					var dataIn = new Uint8Array( reader.result );
					if( self.convertToFloat )
					{
						self.data = new Float32Array( dataIn.length );
						for( var i = 0; i < dataIn.length; ++i )
						{
							self.data[ i ] = dataIn[ i ] / Math.pow( 2, 8 ) - 1;
						}
					}
					else
					{
						self.data = dataIn;
					}
					self.metadata.format = "BYTE";
				}	        	
	        	else
	        	{
	        		throw "Data format (" + self.metadata.format + ") not supported yet."
	        	}

	            self.readBinary = true;

	            self.metaInput.setHidden( false );
	            self.volumeInput.setHidden( true );

	            self.metadata[ 'file' ] = file.name;

	            if( self.readMetadata ) {
	                self.begin();
	            }
	        }
	    }, false );

	    this.TFView.getInputElement().addEventListener( 'change', function( e ) {
	        var file = e.target.files[ 0 ];
	        var reader = new FileReader();
	        reader.readAsArrayBuffer( file );
	        reader.onload = function() {

	            self.colTfData = new Float32Array( reader.result );
				self.TFView.setColorTF( file.name, self.colTfData );
				self.VolRenderer.setColorTF( self.colTfData );				

	        	self.updateAll();
	        }
	    }, false ); 

	    document.querySelector( this.resizeHandle.getSelector() ).addEventListener( 'dragged', function( e ) {
			self.applyLayout(); 
			self.updateAll();
	    }, false );
		document.querySelector( this.volumeCheckBox.getSelector() ).addEventListener( 'changed', function( e ) {
			self.renderVolView( self.volView3d );
	    }, false );
		document.querySelector( this.preIntegrateCheckBox.getSelector() ).addEventListener( 'changed', function( e ) {
			self.renderVolView( self.volView3d );
	    }, false );
		document.querySelector( this.rayCastingCheckBox.getSelector() ).addEventListener( 'changed', function( e ) {
			self.renderVolView( self.volView3d );
	    }, false );
		document.querySelector( this.lightingCheckBox.getSelector() ).addEventListener( 'changed', function( e ) {
			self.renderVolView( self.volView3d );
	    }, false );
	    document.querySelector( this.axisCheckBox.getSelector() ).addEventListener( 'changed', function( e ) {
			self.renderVolView( self.volView3d );
	    }, false );

	    document.querySelector( this.annoCheckBox.getSelector() ).addEventListener( 'changed', function( e ) {
			self.renderVolView( self.volView3d );
	    }, false );

	    document.querySelector( this.bbCheckBox.getSelector() ).addEventListener( 'changed', function( e ) {
			self.renderVolView( self.volView3d );
	    }, false );

		for( var i = 0; i < this.sliceViews.length; ++i )
		{
			( function() {
				var v = self.sliceViews[ i ];
				document.querySelector( self.sliceViews[ i ].getSelector() ).addEventListener( 'changed', function( e ) 
				{
					if( self.readMetadata && self.readBinary )
					{			
						self.renderSliceView( v );
						self.renderVolView( self.volView3d );
					}
				}, false );
			}() )
		}

	    document.querySelector( self.volView3d.getSelector()  ).addEventListener( 'changed', function( e ) {
			if( self.readMetadata && self.readBinary )
			{		
				self.renderVolView( self.volView3d );
			}
	    }, false );
	

	    document.querySelector( self.TFView.getSelector()  ).addEventListener( 'colorTFModified', function( e ) {
			self.TFView.getOpacityBuffer()
	    	self.VolRenderer.setTF( self.TFView.getColorBuffer(), self.TFView.getOpacityBuffer() );
			self.updateAll();

	    }, false );
	

		document.querySelector( self.TFView.getSelector()  ).addEventListener( 'opacityTFModified', function( e ) {
	    	self.tfChanged = true
			self.VolRenderer.setTF( self.TFView.getColorBuffer(), self.TFView.getOpacityBuffer() );
			self.opcTfData = self.TFView.getOpacityBuffer()
			//self.VolRenderer.setOpacityTF( self.TFView.getOpacityBuffer())
			self.updateAll();

	    }, false );

	    ///////////////////////////////////////////////////////////////////////////////////////////////////////

	    this.applyLayout();
	    this.updateAll();
    
	    return this;
    }
}