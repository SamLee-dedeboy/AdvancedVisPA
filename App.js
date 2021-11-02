

function parseMetadata( text )
{
	var lines = text.split( '\n' );
	return {
		"format" : lines[ 0 ],
		"dims"   : lines[ 1 ].split( ' ' ).map( Number ),		
		"name"   : lines[ 2 ]	
	}
}

class App extends Widget {

	updateAll()
	{
		this.applyLayout();
		this.histogramView.render();
	}

	applyLayout()
	{
		var windowWidth  = window.innerWidth;
		var windowHeight = window.innerHeight;

		const yStart = 50;
		const minPanelWidth = 174;
		const maxPanelWidth = windowWidth / 2.0;
		this.rendered = false
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
	        .setSize( this.panelWidth, 230 );
		
		this.nBinSlider
			.setPosition( this.margin, this.histogramView.getPosition().y + this.histogramView.getSize().y + this.margin*2)
			.setSize(RangeSliderStyle.sliderWidth, 30)
		return this;
	}

	begin()
	{
		this.histogramView.set( new HistogramModel( this.data, this.nBinSlider.nBins ) );
		this.updateAll();
	}

	constructor()
	{
		super( 'App', 'body' );

		// data structures /////////////////////////////////////

	    this.data = null;	    

	    this.metadata = {
	    	"dims"   : null,
	    	"format" : null,
	    	"name"   : null
	    };

	    // state ////////////////////////////////////////////////

	    this.readBinary   = false;
	    this.readMetadata = false;

	    // properties //////////////////////////////////////////

		this.margin = 10;
		this.panelWidth = 470;


		// Views/Widgets ///////////////////////////////////////////////////////////////////////////////////////

        this.metaInput = new FileInput( 
        	this.id + "_fileIn", 
        	'body', 
        	"Load HDR File" );

        this.volumeInput = new FileInput( 
        	this.id + "_fileIn", 
        	'body', "Load Volume Data" ).setHidden( true );

	    this.metaDataView = new MetaDataView( 
	    	'MetaDataView', 
	    	this.getSelector(), 
	    	[ "name", "dims", "format" ], 
	    	"Dataset Information" );

	    this.histogramView = new HistogramView( 
	    	'HistogramView', 
	    	this.getSelector() )
	        .setBkgColor( 20, 20, 20 )
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
		this.applyLayout();

	    // listeners ///////////////////////////////////////////////////////////////

	    var self = this;
		self.nBinSlider.getSlider().addEventListener('input', function(e) {
			if(self.readBinary == true) {
				self.histogramView.set(new HistogramModel(self.data, this.value))
				self.histogramView.render()	
			}
		})
		window.addEventListener(
			'resize', 
			function() { 
				self.applyLayout() 
				self.updateAll();
			},
			false );

	    document.querySelector( this.resizeHandle.getSelector() ).addEventListener( 'dragged', function( e ) {
			self.applyLayout(); 
			self.updateAll();
	    }, false );
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
				//self.histogramView.clearCanvas()
				// let rgb = HistogramStyles.default["background-color"]
				// self.histogramView.clear(rgb.substring(4, rgb.length-1).replace(/ /g, '').split(','))
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

	        	if( self.metadata.format == "FLOAT" )
	        	{
	            	self.data = new Float32Array( reader.result );
	        	}
	        	else if( self.metadata.format == "SHORT" )
	        	{
	            	self.data = new Uint16Array( reader.result );
	            	self.metadata.format = "SHORT";
	        	}
	        	else if( self.metadata.format == "BYTE" )
	        	{
	            	self.data = new Uint8Array( reader.result );
	        	}	        	
	        	else
	        	{
	        		throw "Data format (" + self.metadata.format + ") not supported yet."
	        	}

	            self.readBinary = true;

	            self.metaInput.setHidden( false );
	            self.volumeInput.setHidden( true );

	            if( self.readMetadata ) {
					console.log(self.data.length)

	                self.begin();
	            }
	        }
	    }, false );
		
    }
}