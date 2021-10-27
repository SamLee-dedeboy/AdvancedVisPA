
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

        this.dragTopPad    = 0;
        this.dragBottomPad = 0;
        this.dragLeftPad   = 0;
        this.dragRightPad  = 0;

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
                if( self.boxShadow != "none" )
                {
                    element.style[ 'box-shadow' ] = "0px 0px 3px 2px rgba( 20, 20, 20, 0.2 )";
                }
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
                e.preventDefault();

                let newX = self.getPosition().x;
                let newY = self.getPosition().y;

                var container = document.querySelector( self.getSelector() ).parentElement;
                var pxAsNumber = function( asStyle ) { return Number( asStyle.replace( 'px', '' ) ); }

                var minX = self.dragLeftPad; 
                var maxX = pxAsNumber( container.style.width ) - self.dragRightPad; 

                // var minY = this.dragBottomPad; 
                var maxY = pxAsNumber( container.style.height ) - self.dragTopPad; 
                var minY = self.dragBottomPad; 

                if( self.dragable.x == true )
                {
                    newX = e.pageX - self.mouseStartDX;
                }

                if( self.dragable.y == true )
                {
                    newY = e.pageY - self.mouseStartDY;
                }

                self.setPosition(  
                    Math.min( Math.max( newX, minX ), maxX - self.getSize().x ),
                    Math.max( Math.min( newY, maxY ), minY )
                );

                if( self.dragable.x == true || self.dragable.y == true )
                {
                    element.dispatchEvent( new CustomEvent( "dragged", { "detail" : self.id } ) );
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

    setDragable( dx, dy, leftPad = 0, rightPad = 0, topPad = 0, bottomPad = 0 )
    {
        this.dragable = 
        { 
            "x" : dx, 
            "y" : dy 
        };

        this.dragTopPad    = topPad;
        this.dragBottomPad = bottomPad;
        this.dragLeftPad   = leftPad;
        this.dragRightPad  = rightPad;

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
            this.boxShadow = 'none';
            e.style[ 'box-shadow' ] = "none";
        }

        return this;
    }

    setCSSProperty( p, v )
    {
        let e = document.querySelector( "#" + this.id );
        e.style[ p ] = v;
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
