class MyRangeSlider extends Widget {
    constructor( idPrefix, parent, title, defaultBins, steps, x = 0.0, y = 0.0, width = 400.0, height = 20.0) 
    {
        super( idPrefix, parent, x, y, width, height );
        this.setSize(width, height)
        this.nBins = RangeSliderStyle.defaultnBins
        
        // set widget display to 'flex' to make inside 
        // elements align
        let e = document.querySelector(this.getSelector()) 
        e.style.display = "flex"
        e.style.flexDirection = "row"
        e.style.alignItems = "center"

        //
        // title
        //

        // container element
        this.titleElement = document.createElement('span')
        this.titleElement.innerHTML = title
        this.titleElement.style.position = "relative"
        this.titleElement.style.fontSize = "small"
        this.titleElement.style.left = "15px"
        this.titleElement.style.width = "60px"
        e.append(this.titleElement)

        
        //
        // range slider
        //
        this.slider = document.createElement('input');
        this.slider.setAttribute('type', 'range')        
        this.slider.setAttribute("min", RangeSliderStyle.minBins)
        this.slider.setAttribute("max", RangeSliderStyle.maxBins)
        this.slider.setAttribute("value", this.nBins)
        this.slider.setAttribute("step", RangeSliderStyle.step)
        this.slider.style.position = "relative"
        this.slider.style.left = 20
        e.append( this.slider );        

        //
        // value 
        //
        this.value = document.createElement('span')
        this.value.innerHTML = this.slider.value
        this.value.style.position = "relative"
        this.value.style.fontSize = "small"
        this.value.style.left = "10px"
        e.append(this.value)

        this.slider.addEventListener('input', this.updateValue.bind(this), false)
        return this;    
    }
    updateValue(event) {
        this.value.innerHTML = this.slider.value
        this.nBins = this.slider.value
    }

    getSlider() {
        return this.slider
    }
}