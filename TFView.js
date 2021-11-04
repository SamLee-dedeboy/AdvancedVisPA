
class TFView extends Widget 
{
	
	constructor( idPrefix, parent, fields, title, x = 0.0, y = 0.0, width = 400.0, height = 400.0) 
    {
        super( idPrefix, parent, x, y, width, height );

		this.tfName = "Default";

		// canvas to render a color gradient //////////////////////////////////

	    this.colorGradientCanvas = document.createElement( 'canvas' );
	    this.colorGradientCanvas.setAttribute( 'id', this.id + "_colorTFCanvas" );

	    this.colorGradientCanvas.style.position = 'absolute';	    	    
	    this.colorGradientCanvas.style[ 'border-radius' ] = '0.2rem';	    
        this.colorGradientCanvas.style[ 'box-shadow' ] = "1px 1px 4px 0px rgba(0,0,0,0.3)";
	    this.colorGradientContext = this.colorGradientCanvas.getContext( "2d" );

        this.fileInput = new FileInput( this.id + "_fileIn", this.getSelector(), "Load Color TF" );
		document.querySelector( this.getSelector() ).append( this.colorGradientCanvas );
		this.setHasBorder( false );
        this.buffer = new Float32Array();

        this.applyLayout();

        return this;
    }

    applyLayout()
    {
    	this.fileInput.setPosition( 0, 0 );
    	this.colorGradientCanvas.style.top = "44px"; 
    	this.colorGradientCanvas.style.left = "0px";    

    	if( this.getSize().x != this.colorGradientCanvas.width 
    	 || this.getSize().y != this.colorGradientCanvas.height || true )
    	{
		    this.colorGradientCanvas.width = this.getSize().x;
		    this.colorGradientCanvas.height  = 40;
		    this.colorGradientCanvas.style.height = 40 + 'px';
		    this.colorGradientCanvas.style.width  = this.getSize().x + "px";

		    if( this.buffer.length > 0 )
		    {
		    	this.renderGradientFromBuffer( 
		    		this.colorGradientCanvas, 
		    		this.colorGradientContext,
		    		3,
		    		this.buffer );
		    }
    	}	 
    }

    // TODO --- render a gradient to the given canvas based on the given array of colors
    // note that the colors in data are normalized so that each channel is 0-1. But
    // the canvas  expects rgb strings with values between 0-255
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
	componentToHex(c) {
		var hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	}
	rgbToHex(color) {
		return "#" + this.componentToHex(color[0]) + this.componentToHex(color[1]) + this.componentToHex(color[2]);
	  }
    setSize( x, y )
    {
    	super.setSize( x, y );
    	this.applyLayout();
    	return this;
    }

    set( tfName, colorBuffer )
    {
    	this.tfName = tfName;
    	this.buffer = colorBuffer;

    	this.renderGradientFromBuffer( 
    		this.colorGradientCanvas, 
    		this.colorGradientContext,
    		3,
    		this.buffer );

    	return this;
    }

    getInputElement()
    {
    	return this.fileInput.getInputElement();
    }
}