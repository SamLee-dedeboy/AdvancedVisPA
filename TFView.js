
class TFView extends Widget 
{
	static ocpWidth  = 5;
	static ccpWidth = 10;
	static tfOffset = 10;
	static ocpColor = [0.5, 0.5, 0.5]
	constructor( idPrefix, parent, fields, title, x = 0.0, y = 0.0, width = 400.0, height = 400.0) 
    {
        super( idPrefix, parent, x, y, width, height );

		this.tfName = "Default";
		this.histogramCanvas = document.createElement('canvas')
		this.histogramCanvas.setAttribute('id', this.id + "_histogramCanvas");
		this.histogramCanvas.style.position = 'absolute';	    	    
	    this.histogramCanvas.style[ 'border-radius' ] = '0.2rem';	   
		this.histogramCanvas.style.zIndex = '10' 
		this.hstrgmContext  = this.histogramCanvas.getContext( "2d");

		
	    this.opacityTransferFunctionCanvas = document.createElement( 'canvas' );
	    this.opacityTransferFunctionCanvas.setAttribute( 'id', this.id + "_opacityTFCanvas" );
	    this.opacityTransferFunctionCanvas.style.position = 'absolute';	    	    
	    this.opacityTransferFunctionCanvas.style[ 'border-radius' ] = '0.2rem';	    
        this.opacityTransferFunctionCanvas.style[ 'box-shadow' ] = "1px 1px 4px 0px rgba(0,0,0,0.3)";
		this.opacityTransferFunctionCanvas.style.zIndex = this.histogramCanvas.style.zIndex + 1 + ''

	    this.opacityTransferFunctionContext = this.opacityTransferFunctionCanvas.getContext( "2d" );
	    this.colorGradientCanvas = document.createElement( 'canvas' );
	    this.colorGradientCanvas.setAttribute( 'id', this.id + "_colorTFCanvas" );
	    this.colorGradientCanvas.style.position = 'absolute';	    	    
	    this.colorGradientCanvas.style[ 'border-radius' ] = '0.2rem';	    
        this.colorGradientCanvas.style[ 'box-shadow' ] = "1px 1px 4px 0px rgba(0,0,0,0.3)";
	    this.colorGradientContext = this.colorGradientCanvas.getContext( "2d" );

	    this.opacityCanvasContainer       = new Widget( "OpacityTFContainer", this.getSelector() ).setZ( 99 );
	    this.colorGradientCanvasContainer = new Widget( "ColorTFContainer",   this.getSelector() ).setZ( 99 );

	    var self = this;
	    document.querySelector( this.opacityCanvasContainer.getSelector() ).addEventListener( "dblclick", e => {
	    	e.preventDefault();
	    	var x = e.pageX - self.getPosition().x;
	    	var y = e.pageY - ( self.getPosition().y + self.opacityCanvasContainer.getPosition().y );
    		self.opacityTFClicked( "double", { "x" : x , "y" : y } );
    	} );	

		document.querySelector( this.opacityCanvasContainer.getSelector() ).addEventListener( 'contextmenu', function( e ) {
		    e.preventDefault();
	    	var count = e.detail;
	    	var x = e.pageX - self.getPosition().x;
	    	var y = e.pageY - ( self.getPosition().y + self.opacityCanvasContainer.getPosition().y );
    		self.opacityTFClicked( "right", { "x" : x , "y" : y } );
		}, false);

	    document.querySelector( this.colorGradientCanvasContainer.getSelector() ).addEventListener( "dblclick", e => {
	    	e.preventDefault();
	    	var x = e.pageX - self.getPosition().x;
    		self.colorTFClicked( "double" , x  );
    	} );	

		document.querySelector( this.colorGradientCanvasContainer.getSelector() ).addEventListener( 'contextmenu', function( e ) {
		    e.preventDefault();
	    	var x = e.pageX - self.getPosition().x;
    		self.colorTFClicked( "right", x  );
		    return false;
		}, false);

        this.fileInput = new FileInput( this.id + "_fileIn", this.getSelector(), "Load Color TF" );
		
		document.querySelector( this.colorGradientCanvasContainer.getSelector() ).append( this.colorGradientCanvas );
		document.querySelector( this.opacityCanvasContainer.getSelector() ).append( this.opacityTransferFunctionCanvas );		
		document.querySelector( this.opacityCanvasContainer.getSelector() ).append( this.histogramCanvas );		

		this.setHasBorder( false );
        
        this.colorBuffer   = new Float32Array();
        this.opacityBuffer = new Float32Array();        	
		this.spline = new Array().fill({
			x:0,
			y:0
		})
        this.bkgColor = 'rgb( 40, 40, 40)';
		
        this.colorControlPointElements   = {};
        this.opacityControlPointElements = {};

		
        return this;
    }
	initOpacityControlPoint(color) {
		var startPx = 0, startPy = 0, endPx = 1, endPy = 0;
		if(this.opacityBuffer.length != 0) {
			startPy = this.opacityBuffer[0]
			endPy = this.opacityBuffer[this.opacityBuffer.length-1]
		}
    	// create a widget to use as the control point
    	var startControlPoint = new Widget( 
    		"OpacityControlPoint", 
    		this.opacityCanvasContainer.getSelector(), 
    		TFView.tfOffset + ( this.getSize().x - 2* TFView.tfOffset ) * startPx - TFView.ocpWidth, 
    		( this.opacityCanvasContainer.getSize().y ) * ( 1.0 - startPy ) - TFView.ocpWidth, 
    		2*TFView.ocpWidth, 
    		2*TFView.ocpWidth ).setZ( 999999 )
    			.setBkgColor( 255*color[0], 255*color[1], 255*color[2] )
 				.setCSSProperty( '-webkit-filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
 				.setCSSProperty( 'filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
 				.setCSSProperty( 'border-radius', TFView.ocpWidth + 'px' )
    			.setHasBorder( false );
		var endControlPoint = new Widget( 
			"OpacityControlPoint", 
			this.opacityCanvasContainer.getSelector(), 
			TFView.tfOffset + ( this.getSize().x - 2* TFView.tfOffset ) * endPx - TFView.ocpWidth, 
			( this.opacityCanvasContainer.getSize().y ) * ( 1.0 - endPy ) - TFView.ocpWidth, 
			2*TFView.ocpWidth, 
			2*TFView.ocpWidth ).setZ( 999999 )
				.setBkgColor( 255*color[0], 255*color[1], 255*color[2] )
					.setCSSProperty( '-webkit-filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
					.setCSSProperty( 'filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
					.setCSSProperty( 'border-radius', TFView.ocpWidth + 'px' )
				.setHasBorder( false );
    	// make the widget dragable only vertically

    	startControlPoint.setDragable( false, true, 0, 0, TFView.ocpWidth, -TFView.ocpWidth );
		startControlPoint.px = startPx;
		startControlPoint.py = startPy;

		endControlPoint.setDragable( false, true, 0, 0, TFView.ocpWidth, -TFView.ocpWidth );
		endControlPoint.px = endPx;
		endControlPoint.py = endPy;
    	// add the element handle to an array
    	this.opacityControlPointElements[ startControlPoint.id ] = startControlPoint;	
		this.opacityControlPointElements[ endControlPoint.id ] = endControlPoint;
	    	var self = this;
    	document.querySelector( startControlPoint.getSelector() ).addEventListener( "dragged", function( e ) {
    		var id = e.detail;
    		self.opacityControlPointMoved( id );
    	} );	
		document.querySelector( endControlPoint.getSelector() ).addEventListener( "dragged", function( e ) {
    		var id = e.detail;
    		self.opacityControlPointMoved( id );
    	} );	
		//this.render();
	}

	initColorControlPoint() {
		var startPos = 0, endPos = 1;
		var color = [0,0,0]
		var cssColor = 'rgb( ' + color[ 0 ] * 255.0 + ', ' 
		+ color[ 1 ] * 255.0 + ' ,' 
		+ color[ 2 ] * 255.0 + ')';

		// create a widget to use as the control point
		var startControlPoint = new Widget( 
			"StartColorControlPoint", 
			this.colorGradientCanvasContainer.getSelector(), 
			startPos * ( this.getSize().x - 2*TFView.ccpWidth ), 
			0,
			TFView.ccpWidth, 
			this.colorGradientCanvasContainer.getSize().y, 
			 ).setZ( 999999 )
			 .setCSSProperty( 'border', 0.2 + 'px solid #000000'  )
			 .setCSSProperty( 'border-radius', TFView.ccpWidth)
			 .setCSSProperty( 'background', cssColor + '')
			.setCSSProperty( '-webkit-filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
			.setCSSProperty( ' filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
			.setHasBorder( false );
	
		var endControlPoint = new Widget( 
			"EndColorControlPoint", 
			this.colorGradientCanvasContainer.getSelector(), 
			endPos * ( this.getSize().x - 2*TFView.ccpWidth ), 
			0,
			TFView.ccpWidth, 
			this.colorGradientCanvasContainer.getSize().y, 
			 ).setZ( 999999 )
			 .setCSSProperty( 'border', 0.2 + 'px solid #000000'  )
			 .setCSSProperty( 'border-radius', TFView.ccpWidth)
			.setCSSProperty( '-webkit-filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
			.setCSSProperty( ' filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
			.setHasBorder( false );
		
		startControlPoint.px = startPos
		endControlPoint.px = endPos
		// make the widget dragable only horizontally
		startControlPoint.setDragable( false, false, 0, 2*TFView.ccpWidth, 0, 0 );
		endControlPoint.setDragable( false, false, 0, 2*TFView.ccpWidth, 0, 0 );
		startControlPoint.enabled = true
		endControlPoint.enabled = true
		this.addColorPicker(startControlPoint)
		this.addColorPicker(endControlPoint)
			
		// add the element handle to an array
		this.colorControlPointElements[ startControlPoint.id ] = startControlPoint;
		this.colorControlPointElements[ endControlPoint.id ] = endControlPoint;
		var self = this;
		document.querySelector( startControlPoint.getSelector() ).addEventListener( "dragged", function( e ) {
			var id = e.detail;
			self.colorControlPointMoved( id );
		} );
		document.querySelector( endControlPoint.getSelector() ).addEventListener( "dragged", function( e ) {
			var id = e.detail;
			self.colorControlPointMoved( id );
		} );	
		this.setColorTFControlsFromColorBuffer(this.colorBuffer)
	}
	addColorPicker(controlPoint) {
		var controlPointElement = document.querySelector(controlPoint.getSelector())
		var colorPicker = document.createElement("input")
		colorPicker.setAttribute("type", "color");
		colorPicker.setAttribute("id", controlPoint.getSelector() + "_colorPicker");
		colorPicker.style.visibility = 'hidden'
		colorPicker.style.width = '0px';
		colorPicker.style.height = '0px';
		colorPicker.style.marginTop = '2px'
		controlPointElement.append(colorPicker);
		controlPoint.colorPicker = colorPicker

		controlPointElement.addEventListener("mousedown", function(e) {
			if(e.which == 3) {
				//controlPoint.setCSSProperty( 'border-bottom', TFView.cpWidth * 2 + 'px solid ' + colorPicker.value )
				colorPicker.click()
			} 
		}, false)
		var self = this
		colorPicker.addEventListener("input", function(e) {
			self.setColorControlPointColor(controlPoint, e.target.value)		
			self.updateColorBufferFromTFControls()

		}, false)
	}
	setColorControlPointColor(controlPoint, color) {
		controlPoint.setCSSProperty( 'background', color + '')
	}
    opacityTFClicked( clickType, clickPos )
    {
    	if( clickType == "double" )
    	{
	    	var rPos = this.getOpacityControlPointRelativePosition( clickPos, this.opacityCanvasContainer.getSize() );
		    this.addOpacityControlPoint( rPos[ 0 ], rPos[ 1 ], TFView.ocpColor )
    	}
    }

    colorTFClicked( clickType, clickPos )
    {
    	if( clickType == "double" && clickPos > TFView.tfOffset && clickPos < this.getSize().x - TFView.tfOffset )
    	{
	    	var rX = this.getColorControlPointRelativePosition( clickPos, this.colorGradientCanvasContainer.getSize().x );
	    	this.addColorControlPoint( rX, [ 0.5, 0.5, 0.5 ] )
    	}
    }

    /******************************************************************************************/
    /******************************************************************************************/
    /******************************************************************************************/


    // TODO - when the control point moves, update the color buffer through interpolation of the control points
    colorControlPointMoved( id )
    {
    	var controlPoint = this.colorControlPointElements[ id ];

    	/// the normalized position of the control point
		if(controlPoint != null) {
			var x = this.getColorControlPointRelativePosition( controlPoint.getPosition().x + TFView.ccpWidth, this.colorGradientCanvasContainer.getSize().x );

			// console.log( x )
			controlPoint.px = x

			// ...
			this.updateColorBufferFromTFControls()
		}
    }

    // TODO - when the control point moves, update the opacity buffer through interplation of the contol points
    opacityControlPointMoved( id )
    {
    	var controlPoint = this.opacityControlPointElements[ id ];

    	/// the normalized position of the control point
    	var pos = this.getOpacityControlPointRelativePosition( {
    		"x" : controlPoint.getPosition().x + TFView.ocpWidth,
    		"y" : controlPoint.getPosition().y + TFView.ocpWidth
    	}, this.opacityCanvasContainer.getSize() );

    	controlPoint.px = pos[0];
		controlPoint.py = pos[1];
		this.updateOpacityBufferFromTFControls()

		this.render();


    	document.querySelector( this.getSelector() ).dispatchEvent( new Event( "opacityTFModified" ) );
    }
	B(i, k, u, t) {

		if(k == 0) {
			if(u >= t[i] && u <= t[i+1]) {
				//console.log("!!!!!!!",i,k,1)
				return 1;
			} else {	
				//console.log("!!!!!!!",i,k,0)

				return 0;
			}
		} else {
			
			var p1, p2
		
			if((t[i+k] - t[i]) === 0) {
				p1 = 0
				
			} else {
				
				
				var factor = this.B(i, k-1, u, t)
				p1 = ((u-t[i]) / (t[i+k] - t[i]))*factor
			
			}
			if((t[i+k+1]-t[i+1]) === 0) {
				p2 = 0;
			} else {
				
				var factor = this.B(i+1, k-1, u, t)
				
				p2 = ((t[i+k+1]-u)/(t[i+k+1]-t[i+1]))*factor
			}
			// if(u >= 0.9) {
			// 	console.log((u-t[i]) / (t[i+k] - t[i]), ((t[i+k+1]-u)/(t[i+k+1]-t[i+1])))
			// }
		
			
			return p1 + p2
		}
	}
	B_spline(n, u, k, t, w) {
		var point = {
			x:0,
			y:0
		}
		var sum = 0
		for(var i = 0; i < n+1; ++i) {
			var factor = this.B(i, k, u, t);
			point.x += w[i].px * factor
			point.y += w[i].py * factor
			sum += factor
		}
		return point;
	}
    // TODO 
    renderOpacityTF()
    {
		
    	var ctx = this.opacityTransferFunctionContext;
    	var W   = this.opacityTransferFunctionCanvas.width;
    	var H   = this.opacityTransferFunctionCanvas.height;
		ctx.fillStyle = [222, 230, 240, 0]

		ctx.clearRect(0, 0, W, H)
    	//ctx.fillRect( 0, 0, W, H );
		ctx.save()
		ctx.strokeStyle = 'rgb(128,128,128)'
		ctx.beginPath()
		//ctx.fillStyle = 'black'
		var spline = this.spline
	
		for(var i = 0; i < spline.length-1; ++i) {
			// var point = [W*(i/spline_length), H*(1-spline[i].y)]
			// console.log(point[1])
			// ctx.arc(point[0], point[1], 0.5, 0, 2 * Math.PI);
			// ctx.fill();
			
		
			// var pointA = [W*(i/spline_length), H*(1-spline[i].y)]
			// var pointB = [W*((i+1)/spline_length), H*(1-spline[i+1].y)]
			var pointA = [W*(spline[i].x), H*(1-spline[i].y)]
			var pointB = [W*(spline[i+1].x), H*(1-spline[i+1].y)]
			ctx.moveTo(pointA[0], pointA[1]);
			ctx.lineTo(pointB[0], pointB[1]);
			ctx.stroke();	
		}
		//console.log(spline[spline.length-1].y)
		ctx.closePath()
		// ctx.beginPath()
		// for(var i = 0; i < sortedPoints.length-1; ++i) {
		// 	var pointA = [sortedPoints[i].px * W, (1-sortedPoints[i].py) * H];
		// 	var pointB = [sortedPoints[i+1].px * W, (1-sortedPoints[i+1].py) * H];
		// 	ctx.moveTo(pointA[0], pointA[1]);
		// 	ctx.lineTo(pointB[0], pointB[1]);
		// 	ctx.stroke();		
		// }
		// ctx.closePath()
		ctx.restore();

    }

    // TODO
    renderColorTF()
    {
		this.renderGradientFromBuffer( 
			this.colorGradientCanvas, 
			this.colorGradientContext,
			3,
			this.colorBuffer );
    }

    // TODO
    setColorTFControlsFromColorBuffer( colorBuffer ) 
    {
		for(var key in this.colorControlPointElements) {
			var controlPoint = this.colorControlPointElements[key];
			var relativePos = this.getColorControlPointRelativePosition(controlPoint.getPosition().x + TFView.ccpWidth/2, this.getSize().x)
			var index = Math.round((Math.ceil((colorBuffer.length-3) * relativePos)/3))*3;
			index = index<0? 0:index;
			var color = [
				Math.round(colorBuffer[index] * 255),
				Math.round(colorBuffer[index+1] * 255),
				Math.round(colorBuffer[index+2] * 255)
			]
			//console.log(controlPoint, index, color)
			document.getElementById(controlPoint.getSelector() + "_colorPicker").value = this.rgbToHex(color)
			this.setColorControlPointColor(controlPoint, this.rgbToHex(color)) 
		}
    }

    // TODO
    updateColorBufferFromTFControls() 
    {
    	let buffer = this.colorBuffer;
		var sortedPoints = []
	
		for(var key in this.colorControlPointElements) {
			sortedPoints.push(this.colorControlPointElements[key])
			
		}
		sortedPoints.sort(function(a,b) {
			return a.px - b.px;
		})
		for(var i = 0; i < sortedPoints.length-1; ++i) {
			var controlPoint = sortedPoints[i]
			var nextControlPoint = sortedPoints[i+1]
			var color = controlPoint.colorPicker.value
			var nextColor = nextControlPoint.colorPicker.value
			var relativePos = this.getColorControlPointRelativePosition(controlPoint.getPosition().x + TFView.ccpWidth/2, this.getSize().x)
			var nextRelativePos = this.getColorControlPointRelativePosition(nextControlPoint.getPosition().x + TFView.ccpWidth/2, this.getSize().x)
			var index = Math.round((Math.ceil((buffer.length) * relativePos)/3))*3;
			var nextIndex = Math.round((Math.ceil((buffer.length) * nextRelativePos)/3))*3;
			var rgb = this.hexToRGB(color + '')
			var nextRgb = this.hexToRGB(nextColor + '')
			var gradient = {
				r: (nextRgb.r - rgb.r)/(nextIndex - index),
				g: (nextRgb.g - rgb.g)/(nextIndex - index),
				b: (nextRgb.b - rgb.b)/(nextIndex - index)
			}
			for(var p = index; p <= nextIndex; p+=3) {
				buffer[p] = (rgb.r + (p-index)*gradient.r)/255 
				buffer[p+1] = (rgb.g + (p-index)*gradient.g)/255 
				buffer[p+2] = (rgb.b + (p-index)*gradient.b)/255 
			}
			
		}
		this.renderColorTF()
    	document.querySelector( this.getSelector() ).dispatchEvent( new Event( "colorTFModified" ) );

    }
	updateOpacityBufferFromTFControls() {
		this.opacityBuffer = new Array(this.colorBuffer.length/3)
		var sortedPoints = []
		
		for(var key in this.opacityControlPointElements) {
			sortedPoints.push(this.opacityControlPointElements[key])
		}
		if(sortedPoints.length < 2) {
			return
		}
		sortedPoints.sort(function(a,b) {
			return a.px - b.px;
		})
		let k = 3;
		if(sortedPoints.length <= 4) {
			k = sortedPoints.length-1
		}
		var w = sortedPoints
		//console.log(w)
		let n = sortedPoints.length - 1
		let t = new Array(n+1+k+1)
		let sample_rate = 2
		let spline_length = sample_rate*this.opacityBuffer.length
		for(var i = 0; i < k+1; ++i) {
			t[i] = 0
		}
		var f = n+k+2 - (2*k+2)
		for(var i = 1; i <= f; ++i) {
			t[i-1+k+1] = i/(f+1)
		}
		for(var i = 0; i < k+1; ++i) {
			t[i + k+1 + f] = 1
		}
		// for(var i = 0; i < n+1; ++i) {
		// 	t[i+2] = i/(n+1)
		// }
		// for(var i = 2+n+1; i < n+k+1+1; ++i) {
		// 	t[i] = 1
		// }
		var spline = new Array(spline_length)
		for(var u = 0; u < spline_length; u++) {
			//var ui = u*(t[n+1]-t[k-1])/(spline_length-1);
			var ui = t[k-1] + u*(t[n+1]-t[k-1])/(spline_length-1);
			
			spline[u] = this.B_spline(n, ui, k, t, w)
			//console.log(u/spline_length, spline_length*spline[u].x)
		}
		this.spline = spline
		for(var i = 0; i < this.opacityBuffer.length; ++i) {
			this.opacityBuffer[i] = spline[sample_rate*i].y
		}
		//console.log(this.opacityBuffer)
	}
	// color is from [0,0,0] to [255,255,255]
	componentToHex(c) {
		var hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	  }
	  
	 rgbToHex(color) {
		return "#" + this.componentToHex(color[0]) + this.componentToHex(color[1]) + this.componentToHex(color[2]);
	  }
	
	hexToRGB(hex) {
		var r = parseInt(hex.slice(1, 3), 16),
			g = parseInt(hex.slice(3, 5), 16),
			b = parseInt(hex.slice(5, 7), 16);
	
			return {
				r: r,
				g: g,
				b: b
			}
			//return "rgb(" + r + ", " + g + ", " + b + ")";
		
	}
    // TODO --- INTEGRATE FROM A2
	renderGradientFromBuffer( canvas, context, channels, data )
	{
		context.save()
        let offset = canvas.width/(data.length/channels)
		let width = offset
		let height = canvas.height
		var gradient = context.createLinearGradient(0,0, canvas.width,0);
		for(var i = 0; i < data.length; i+=channels) {
			var color = [0,0,0];
			for(var j = 0; j < channels; j++) {
				color[j] = Math.round(data[i+j]*255)
			}
			gradient.addColorStop((i/channels)*offset/canvas.width, this.rgbToHex(color));
			//context.fillStyle = rgbStr
			//context.fillRect((i/channels)*offset, 0, width, height)
		}
		context.fillStyle = gradient;
		context.fillRect(0,0,canvas.width, canvas.height);
		context.restore()
	}


    /******************************************************************************************/
    /******************************************************************************************/
    /******************************************************************************************/


    // Optional helper code depending on your design
    // position is between 0 and 1
    // color is [ r, g, b ], each 0 to 1
    addColorControlPoint( position, color )
    {	
		if(Object.keys(this.colorControlPointElements).length === 0) {
			this.initColorControlPoint()
		}
    	var cssColor = 'rgb( ' + color[ 0 ] * 255.0 + ', ' 
    						   + color[ 1 ] * 255.0 + ' ,' 
    						   + color[ 2 ] * 255.0 + ')';

    	// create a widget to use as the control point
    	// var controlPoint = new Widget( 
    	// 	"ColorControlPoint", 
    	// 	this.colorGradientCanvasContainer.getSelector(), 
    	// 	position * ( this.getSize().x - 2*TFView.ccpWidth ), 
    	// 	0, 
    	// 	0, 
    	// 	20 ).setZ( 999999 )
    	// 		.setCSSProperty( 'border-bottom', TFView.ccpWidth * 2 + 'px solid ' + cssColor )
    	// 		.setCSSProperty( 'border-left',   TFView.ccpWidth + 'px solid transparent' )
    	// 		.setCSSProperty( 'border-right',  TFView.ccpWidth + 'px solid transparent' )
 		// 		.setCSSProperty( '-webkit-filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
 		// 		.setCSSProperty( ' filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
    	// 		.setHasBorder( false );
		var controlPoint = new Widget( 
    		"ColorControlPoint", 
    		this.colorGradientCanvasContainer.getSelector(), 
    		position * ( this.getSize().x - 2*TFView.ccpWidth ), 
    		0, 
    		TFView.ccpWidth, 
    		this.colorGradientCanvasContainer.getSize().y)
			.setZ( 999999 )
			.setCSSProperty( 'border', 0.2 + 'px solid #000000'  )
			.setCSSProperty( 'border-radius', TFView.ccpWidth)
			.setCSSProperty( '-webkit-filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
			.setCSSProperty( ' filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
			.setHasBorder( false );
		// this.setColorControlPointColor(controlPoint, cssColor)
		controlPoint.px = position
    	// make the widget dragable only horizontally
    	controlPoint.setDragable( true, false, 0, 2*TFView.ccpWidth, 0, 0 );
		var controlPointElement = document.querySelector(controlPoint.getSelector())
		var colorPicker = document.createElement("input")
		colorPicker.setAttribute("type", "color");
		colorPicker.setAttribute("id", controlPoint.getSelector() + "_colorPicker");
		colorPicker.style.visibility = 'hidden'
		colorPicker.style.width = '0px';
		colorPicker.style.height = '0px';
		colorPicker.style.marginTop = '2px'
		controlPointElement.append(colorPicker);
		controlPoint.colorPicker = colorPicker
		var self = this
		controlPointElement.addEventListener("mousedown", function(e) {

			if(e.which == 3) {	// right click event
				e.preventDefault()
				colorPicker.click()
			} else if(e.which == 2) {	// middle click event
				e.preventDefault()
				delete self.colorControlPointElements[controlPoint.id]
				this.remove()
				self.updateColorBufferFromTFControls()
				self.render();
			}
		}, false)

		colorPicker.addEventListener("input", function(e) {
			self.setColorControlPointColor(controlPoint, e.target.value)
			controlPoint.enabled = true
			self.updateColorBufferFromTFControls()

		}, false)
    	// add the element handle to an array
    	this.colorControlPointElements[ controlPoint.id ] = controlPoint;
		this.setColorTFControlsFromColorBuffer(this.colorBuffer)

    	var self = this;
    	document.querySelector( controlPoint.getSelector() ).addEventListener( "dragged", function( e ) {
    		var id = e.detail;
    		self.colorControlPointMoved( id );
    	} );	
    }

    getColorControlPointRelativePosition( px, width )
    {
    	var x = ( px - TFView.tfOffset )
    		  / ( width - TFView.tfOffset*2 );
      
        return x;
    }

    getOpacityControlPointRelativePosition( pos, sz )
    {
    	var x = ( pos.x - TFView.tfOffset ) 
    		  / ( sz.x - TFView.tfOffset*2 );

    	var y = 1.0 - ( pos.y ) 
    		  / ( sz.y  );


		return [ x, y ];
    }

    // Optional helper code depending on your design
    // position is between 0 and 1
    // color is [ r, g, b ], each 0 to 1
    addOpacityControlPoint( px, py, color )
    {	
		if(Object.keys(this.opacityControlPointElements).length === 0) {
			this.initOpacityControlPoint(color)
		}
    	if( ! ( px > 0 && px < 1.0 && py > 0 && py < 1.0 ) )
    	{
    		return;
    	}

    	var cssColor = 'rgb( ' + color[ 0 ] * 255.0 + ', ' 
    						   + color[ 1 ] * 255.0 + ' ,' 
    						   + color[ 2 ] * 255.0 + ')';

    	// create a widget to use as the control point
    	var controlPoint = new Widget( 
    		"OpacityControlPoint", 
    		this.opacityCanvasContainer.getSelector(), 
    		TFView.tfOffset + ( this.getSize().x - 2* TFView.tfOffset ) * px - TFView.ocpWidth, 
    		( this.opacityCanvasContainer.getSize().y ) * ( 1.0 - py ) - TFView.ocpWidth, 
    		2*TFView.ocpWidth, 
    		2*TFView.ocpWidth ).setZ( 999999 )
    			.setBkgColor( 255*color[0], 255*color[1], 255*color[2] )
 				.setCSSProperty( '-webkit-filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
 				.setCSSProperty( 'filter', 'drop-shadow(1px 1px 1px rgba(0,0,0,.5)' )
 				.setCSSProperty( 'border-radius', TFView.ocpWidth + 'px' )
    			.setHasBorder( false );
		
    	// make the widget dragable only horizontally
    	controlPoint.setDragable( true, true, 0, 0, TFView.ocpWidth, -TFView.ocpWidth );
		controlPoint.px = px;
		controlPoint.py = py;
    	// add the element handle to an array
    	this.opacityControlPointElements[ controlPoint.id ] = controlPoint;	
    	var self = this;
    	document.querySelector( controlPoint.getSelector() ).addEventListener( "dragged", function( e ) {
    		var id = e.detail;
    		self.opacityControlPointMoved( id );
    	} );	
		document.querySelector( controlPoint.getSelector() ).addEventListener("mousedown", function(e) {
			if(e.which == 2) {
				e.preventDefault()
				delete self.opacityControlPointElements[controlPoint.id]
				this.remove()
				self.updateOpacityBufferFromTFControls()
				self.render();
			}
		}, false)
		this.updateOpacityBufferFromTFControls()
		this.render();
    }

    applyLayout()
    {
    	this.fileInput.setPosition( 0, 0 );
		this.histogramCanvas.style.top  = "0px"; 
    	this.histogramCanvas.style.left = "0px";   

    	this.histogramCanvas.style.height = 200; 
    	this.histogramCanvas.style.height = 200 + "px"; 
    	this.histogramCanvas.style.width  = this.getSize().x - TFView.tfOffset * 2  + "px";
    	
		this.opacityTransferFunctionCanvas.style.top  = "0px"; 
    	this.opacityTransferFunctionCanvas.style.left = "0px";   

    	this.opacityTransferFunctionCanvas.style.height = 200; 
    	this.opacityTransferFunctionCanvas.style.height = 200 + "px"; 
    	this.opacityTransferFunctionCanvas.style.width  = this.getSize().x - TFView.tfOffset * 2  + "px";

    	this.colorGradientCanvasContainer.setSize( this.getSize().x, 40 );
    	this.colorGradientCanvasContainer.setPosition( 0, 254 );

    	this.opacityCanvasContainer.setSize( this.getSize().x, 200 );
    	this.opacityCanvasContainer.setPosition( 0, 44 );
    	this.colorGradientCanvas.style.left = TFView.tfOffset + 'px';
    	this.opacityTransferFunctionCanvas.style.left = TFView.tfOffset + 'px';
    	this.histogramCanvas.style.left = TFView.tfOffset - HistogramStyles.barStartX+'px';
		this.histogramCanvas.style.top = HistogramStyles.barStartY - HistogramStyles.axisOffset+'px';

    	if( this.getSize().x != this.colorGradientCanvas.width 
    	 || this.getSize().y != this.colorGradientCanvas.height || true )
    	{
		    this.colorGradientCanvas.width = this.getSize().x - 2 * TFView.tfOffset;
		    this.colorGradientCanvas.height  = 40;
		    this.colorGradientCanvas.style.height = 40 + 'px';
		    this.colorGradientCanvas.style.width  = this.getSize().x - 2 * TFView.tfOffset + "px";

		    this.opacityTransferFunctionCanvas.width        = this.getSize().x - 2 * TFView.tfOffset;
		    this.opacityTransferFunctionCanvas.style.width  = this.getSize().x - 2 * TFView.tfOffset + "px";
			this.histogramCanvas.width        = this.getSize().x - 2 * TFView.tfOffset;
		    this.histogramCanvas.style.width  = this.getSize().x - 2 * TFView.tfOffset + "px";
		    if( this.colorBuffer.length > 0 )
		    {
				
				this.render();
		    }
    	}
    }

    repositionColorControls( oldSize, newSize ) 
    {
    	for ( var key of Object.keys( this.colorControlPointElements ) ) 
    	{
    		var point = this.colorControlPointElements[ key ];	

	    	var x = this.getColorControlPointRelativePosition(
	    		point.getPosition().x,
		    	oldSize.x );
    		point.setPosition( 
    			TFView.ccpWidth + ( this.colorGradientCanvasContainer.getSize().x - 2  * TFView.ccpWidth ) * x,
    			point.getPosition().y
    		);
		}
    }

    repositionOpacityControls( oldSize, newSize ) 
    {
    	for ( var key of Object.keys( this.opacityControlPointElements ) ) 
    	{
    		var point = this.opacityControlPointElements[ key ];	

	    	var x = this.getOpacityControlPointRelativePosition( {
		    		"x" : point.getPosition().x,
		    		"y" : point.getPosition().y 
	    		},
		    	oldSize )[ 0 ];
    		point.setPosition( 
    			TFView.ocpWidth + ( this.opacityCanvasContainer.getSize().x - 2*TFView.ocpWidth ) * x,
    			point.getPosition().y
    		);
		}
    }

    render()
    {
		this.renderColorTF();
    	this.renderOpacityTF();
    }
	renderHistogram(otherCanvas) {
		var ctx = this.hstrgmContext;
		ctx.fillStyle = [222, 230, 240, 0]
        ctx.clearRect(0, 0, this.histogramCanvas.width, this.histogramCanvas.height);
		ctx.save();
		ctx.drawImage(otherCanvas, 0, 0)
		ctx.restore();
	}
	componentToHex(c) {
		var hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	}
	rgbToHex(color) {
		return "#" + this.componentToHex(color[0]) + this.componentToHex(color[1]) + this.componentToHex(color[2]);
	  }
    setSize( x, y )
    {
    	var oldSize = Object.assign( {}, this.getSize() );
    	super.setSize( x, y );
    	this.applyLayout();
    	this.repositionColorControls( oldSize, this.getSize() );
    	this.repositionOpacityControls( oldSize, this.getSize() );

    	return this;
    }

    setColorTF( tfName, colorBuffer)
    {
    	this.ctfName = tfName;

    	this.colorBuffer = colorBuffer;
		
    	this.renderGradientFromBuffer( 
    		this.colorGradientCanvas, 
    		this.colorGradientContext,
    		3,
    		this.colorBuffer );
		this.removeAllControlPoint()
		
		// update opacityBuffer sample rate on B-spline curve to make it colorBuffer.length/3
		if(this.opacityBuffer.length != this.colorBuffer.length/3) {
			this.updateOpacityBufferFromTFControls();
		}
    	return this;
    }
	setOpacityTF(tfName, opacityBuffer) {
		this.otfName = tfName;
    	this.opacityBuffer = opacityBuffer;

		
		if(Object.keys(this.opacityControlPointElements).length === 0) {
			this.initOpacityControlPoint(TFView.ocpColor)
			var spline = new Array(this.opacityBuffer.length)
			for(var i = 0; i < spline.length; i++) {
				var point = {
					x: i/spline.length,
					y: this.opacityBuffer[i]
				}
				spline[i] = point
			}
			this.spline = spline
		}
		this.renderOpacityTF()

		return this
	}
	removeAllControlPoint() {
		for(var key in this.colorControlPointElements) {
			document.querySelector(this.colorControlPointElements[key].getSelector()).remove()
			delete this.colorControlPointElements[key]
		}
		this.render();
	}
    getColorBuffer()
    {
    	return this.colorBuffer;
    }

    getOpacityBuffer()
    {
    	return this.opacityBuffer;
    }

    getInputElement()
    {
    	return this.fileInput.getInputElement();
    }
}