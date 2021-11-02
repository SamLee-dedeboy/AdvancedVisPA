class MyRangeSlider extends Widget {
    constructor( idPrefix, parent, title, min = 10, max = 255, step = 5, x = 0.0, y = 0.0, width = 400.0, height = 20.0) 
    {
        super( idPrefix, parent, x, y, width, height );
        this.setSize(width, height)
        this.setHasBorder(false)
        this.value = (max - min)/2
        this.min = min;
        this.max = max;
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
        this.titleElement.style.width = "30px"
        this.titleElement.style.textAlign = "center"
        this.titleElement.style.fontFamily = RangeSliderStyle.fontFamily
        e.append(this.titleElement)

        
        //
        // range slider
        //
        this.slider = document.createElement('input');
        this.slider.setAttribute('type', 'range')        
        this.slider.setAttribute("min", min)
        this.slider.setAttribute("max", max)
        this.slider.setAttribute("value", this.value)
        this.slider.setAttribute("step", step)
        this.slider.style.position = "relative"
        this.slider.style.left = '20px'
        e.append( this.slider );        

        //
        // value 
        //
        this.valueElement = document.createElement('span')
        this.valueElement.innerHTML = this.slider.value
        this.valueElement.style.position = "relative"
        this.valueElement.style.fontSize = "small"
        this.valueElement.style.left = "25px"
        this.valueElement.style.fontFamily = RangeSliderStyle.fontFamily
        e.append(this.valueElement)

        this.slider.addEventListener('input', this.updateValue.bind(this), false)
        return this;    
    }
    updateValue(event) {

        this.valueElement.innerHTML = this.slider.value 
        this.value = this.slider.value
    }

    getSlider() {
        return this.slider
    }
    setColor(color) {
        this.value.style.color = color
        this.titleElement.style.color = color
    }
    setValue(value) {
        this.valueElement.innerHTML = value
        this.slider.value = value
        this.value = value
    }
    getMin() {
        return this.min;
    }
    getMax() {
        return this.max;
    }
}