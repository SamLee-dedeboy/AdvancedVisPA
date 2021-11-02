
class Widget {

    static nextId = 0;

    constructor( idPrefix, parent, x = 0.0, y = 0.0, width = 400.0, height = 400.0 ) {
        
        // automatically ensure that each instance has a unique id
        // note that static nextId is a single variable shared by all instances
        // javascript is executed serially so there are no race conditions

        this.id = idPrefix + "_" + Widget.nextId;
        ++Widget.nextId;

        //  member variables 

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.boxShadow = "0px 0px 1px 1px rgba(0,0,0,0.1)";

        this.mouseStartDX = -1;
        this.mouseStartDY = -1;

        this.mousedown = false;

        // create a DOM element to act as a high level container for the Widget 
        // and append it to the parent container

        let d = document.createElement( 'div' );
        d.setAttribute( "id", this.id );
        document.querySelector( parent ).append( d );

        // how to set css attributes directly //////////////////////////////////////

        let element = document.querySelector( this.getSelector() );
       
        element.style.position  = "absolute";
        element.style.left = x + 'px';
        element.style.top  = y + 'px';
        element.style.width = this.width + 'px';
        element.style.height = this.height + 'px';
        element.style[ "background-color" ] = "transparent";

        this.setHasBorder( true );

        this.dragable = {};
        this.setDragable( false, false );
        
        // returning this lets you chain member function calls ////////////////////

        var self = this;

        element.addEventListener( 'mouseover', function(e) {
            if( self.dragable.x == true || self.dragable.y == true )
            {
                element.style[ 'box-shadow' ] = "0px 0px 3px 2px rgba( 250, 140, 0, 0.3 )";
            }
        }, false );

        element.addEventListener( 'mouseout', function(e) {
            if( self.dragable.x == true || self.dragable.y == true )
            {
                element.style[ 'box-shadow' ] = self.boxShadow;
            }
        }, false );

        element.addEventListener( 'mousedown', function(e) {
            self.mouseDown = true;
            self.mouseStartDX = e.pageX - self.getPosition().x;
            self.mouseStartDY = e.pageY - self.getPosition().y;         
        }, false );

        window.addEventListener( 'mouseup', function(e) {
            self.mouseDown = false;
            if( self.dragable.x == true || self.dragable.y == true )
            {
                element.style[ 'box-shadow' ] = self.boxShadow;
            }

        }, false );

        window.addEventListener( 'mousemove', function(e) {
    
            if( self.mouseDown == true && ( self.dragable.x == true || self.dragable.y == true ) )
            {
                let newX = self.getPosition().x;
                let newY = self.getPosition().y;

                if( self.dragable.x == true )
                {
                    newX = e.pageX - self.mouseStartDX;
                }

                if( self.dragable.y == true )
                {
                    newY = e.pageY - self.mouseStartDY;
                }

                self.setPosition(  
                    newX,
                    newY
                );

                if( self.dragable.x == true || self.dragable.y == true )
                {
                    element.dispatchEvent( new Event( "dragged" ) );
                }
            }
        }, false );

        return this;
    }

    // setters /////////////////////////////////////////////////////

    addClass( c )
    {
        let e = document.querySelector( "#" + this.id );
        e.classList.add( c );
        return this;
    }

    setHidden( c )
    {
        let e = document.querySelector( "#" + this.id );        
        e.hidden = c;
        return this;
    }

    setZ( z )
    {
        let e = document.querySelector( "#" + this.id );
        e.style.zIndex = z + "";

        return this;
    }
    
    setBkgColor( r, g, b )
    {
        let e = document.querySelector( "#" + this.id );
        e.style[ "background-color" ] = "rgb(" + r + "," + g + "," + b + " )";

        return this;
    }

    setDragable( dx, dy )
    {
        this.dragable = 
        { "x" : dx, 
        "  y" : dy };

        return this;
    }

    setPosition( x, y )
    {
        this.x = x;
        this.y = y;

        let e = document.querySelector( "#" + this.id );
        e.style.left = x + 'px';
        e.style.top  = y + 'px';

        return this;
    }

    setSize( width, height )
    {
        this.width = width;
        this.height = height;

        let e = document.querySelector( "#" + this.id );
        e.style.width = this.width + 'px';
        e.style.height = this.height + 'px';

        return this;
    }

    applyLayout()
    {
        return this;   
    }   

    setHasBorder( c )
    {
        let e = document.querySelector( "#" + this.id );

        if( c )
        {
            e.style[ 'box-shadow' ] = this.boxShadow;
        }
        else
        {
            e.style[ 'box-shadow' ] = "none";
        }

        return this;
    }

    // getters /////////////////////////////////////////////////

    getPosition()
    {
        return { "x" : this.x, "y" : this.y };
    }

    getSize()
    {
        return { "x" : this.width, "y" : this.height }; 
    }

    getSelector()
    {
        return '#' + this.id;
    }

    aspectRatio()
    {
        return this.width / this.height;
    }
}
