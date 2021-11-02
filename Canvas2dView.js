
class Canvas2dView extends Widget {

    constructor( prefix, parent, x = 0.0, y = 0.0, width = 400.0, height = 400.0) 
    {
        super( prefix, parent, x, y, width, height );

        this.canvas = document.createElement( 'canvas' );
        this.canvas.setAttribute( 'id', this.id + '_canvas2d' );

        this.context = this.canvas.getContext( "2d" );
        
        if( this.context === null )
        {
          window.alert( "Unable to initialize canvas2d." );
          return null;
        }

        let cont = document.querySelector( "#" + this.id );
        cont.append( this.canvas );

        this.canvas.width  = width;
        this.canvas.height = height;

        this.canvas.style.width  =  width + "px";
        this.canvas.style.height = height + "px";

        this.canvas.style.left = x + "px";
        this.canvas.style.top  = y + "px";
        this.canvas.style.position  = "absolute";
        this.canvas.style[ 'background-color' ] = 'rgb( 40, 40, 40 )';

        this.context.fillStyle = 'rgb(0,0,0)';
        this.context.fillRect( 0, 0, width, height );
    }

    setSize( width, height )
    {
        this.width = width;
        this.height = height;

        const toolBarHeight = 0;

        this.canvas.width  = width;
        this.canvas.height = height - toolBarHeight;

        this.canvas.style.width  =  width + "px";
        this.canvas.style.height = ( height - toolBarHeight ) + "px";
        this.canvas.style.top = toolBarHeight + "px";

        this.canvas.style[ 'border-radius' ] = "4px 4px";

        let e = document.querySelector( "#" + this.id );
        e.style.width = this.width + 'px';
        e.style.height = this.height + 'px';

        return this;
    }

    mouseMoved( e )
    {
        return this.mouseDown;
    }

    getMode()
    {
        return this.mode;
    }

    getCanvas()
    {
        return this.canvas;
    }

    getContext()
    {
        return this.context;
    }

    renderText( text, color, xy )
    {
        this.context.save();
        this.context.font = 'bold 14px helvetica';
        this.context.textAlign = "center";  
        this.context.fillStyle = color;
        this.context.fillText( text, xy[ 0 ], xy[ 1 ] );
        this.context.restore();
    }

    render( otherCanvas )
    {
        const invertY = false   ;
        this.context.save();
        if( invertY )
        {
            this.context.translate( 0, this.getSize().y );
            this.context.scale( 1, -1 );
        }
        this.context.drawImage( otherCanvas, 0, 0 );
        this.context.restore();
    }
}
