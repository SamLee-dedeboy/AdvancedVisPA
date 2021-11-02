
class HistogramView extends WebGLView {

    constructor( idPrefix, parent, x = 0.0, y = 0.0, width = 400.0, height = 400.0, model = {} ) {

        super( idPrefix, parent, x, y, width, height );
        this.model = model
        this.barStartX = HistogramStyles.barStartX
        this.barStartY = HistogramStyles.barStartY
        this.barEndY = HistogramStyles.barEndY
        this.rendered = false
        this.canvas2d.addEventListener('mousemove', this.renderWithMouse.bind(this), false)
        this.canvas2d.addEventListener('mousedown', this.selectFirstBar.bind(this), false)
        this.canvas2d.addEventListener('mouseup', this.releaseSelect.bind(this), false)
        this.selectDone = false
        return this;
    }
    getBarIndex(event) {
        let rect = this.canvas2d.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let barWidth = (this.canvasWidth() - this.barStartX)/this.model.nBins
        if(x-this.barStartX < 0)
            return false
        return Math.floor((x-this.barStartX)/barWidth)
    }
    checkMouseInBar(event, barIndex) {
        let rect = this.canvas2d.getBoundingClientRect();
        let y = this.canvasHeight() - (event.clientY - rect.top)
        let selectedBarHeight = this.model.pBarsHeight[barIndex] * (this.canvasHeight() - this.barStartY)
        return (y - this.barStartY <= selectedBarHeight && y - this.barStartY >= 0) 
            
        
    }
    selectFirstBar(event) {
        if(this.rendered == true) {
            this.firstBarIndex = this.getBarIndex(event)

            // check if the click actually lands on a bar
            this.mouseInBar = this.checkMouseInBar(event, this.firstBarIndex)
            
            if(this.mouseInBar == true) {
                // store the bar as first selected bar and currently selecting bar
                this.curBarIndex = this.firstBarIndex
                
                // change the state to selecting
                this.selecting = true
                this.selectDone = false   

                // render the selected bar
                // this is needed when we're previously in state 'selectDone'
                this.renderBars()
                this.highlight([this.firstBarIndex])
                this.displayBarInfo([this.firstBarIndex])
            } else {
                // if the click does not land on a bar
                // clear all the selected bar and re-render
                this.selectDone = false       
                this.render() 
            }
            

        }
    }
    selectOtherBar(event) {
        if(this.rendered == true && this.selecting == true) {
            // if we're in selecting state,
            // check if we're selecting a new bar
            let newBarIndex = this.getBarIndex(event)
            if(newBarIndex != this.curBarIndex) {
                // update current index
                this.curBarIndex = newBarIndex
                // construct bar index list in ascending order
                let start, end
                if(this.firstBarIndex <= this.curBarIndex) {
                    start = this.firstBarIndex
                    end = this.curBarIndex
                } else {
                    start = this.curBarIndex
                    end = this.firstBarIndex
                }
                let barIndexList = new Array()
                for(var i = start; i <= end; i++) {
                    barIndexList.push(i)
                }
                // render with selected area highlighted
                this.renderBars()
                this.highlight(barIndexList)
                this.displayBarInfo(barIndexList)
            }
        }
    }
    releaseSelect(event) {
        if(this.selecting == true) {
            this.selectDone = true
        }
        this.selecting = false
    }
    renderWithMouse(event) {
        if(this.rendered == true) {
            // calculate barIndex
            let barIndex = this.getBarIndex(event)
            if(this.selecting) {
                this.selectOtherBar(event)
            } else if(!this.selectDone && this.checkMouseInBar(event, barIndex) == true) {
                // not selecting, just render the hovered bar
                this.renderBars()
                this.highlight([barIndex])
                this.displayBarInfo([barIndex])
            } else if(!this.selectDone){
                this.render()
            }
        }
    }
    render()    
    {
        if(this.rendered == true) {
            this.clearCanvas2d()
        }
        this.rendered = true
        this.renderBars()
        this.renderAxis()
        this.renderLabels()
        
    }

    setStyle( s ) {
        let e = document.querySelector(this.getSelector())
        for (var property in s)
        {
            e.style[property] = s[property];
        }
        return this;
    }

    set( model ) {
        this.model = model
        return this;
    }
    renderBars() {
        let lines = this.generateLines(this.model)
        // Since coordinates in 'lines' range from:
        // [0, this.canvasWidth() - this.barStartX] for x axis,
        // [0, this.canvasHeight() - this.barStartY - this.barEndY] for y axis
        // which is relative to histogram canvas(data space)
        // so in order to leave out space for lables,
        // the bounding box lower left corner should be negative
        this.render2d(new Float32Array(lines), {xMin: -this.barStartX, yMin: -this.barStartY, xMax: this.canvasWidth(), yMax: this.canvasHeight() - this.barStartY}, HistogramStyles.barColor, this.gl.TRIANGLES)
    }
    renderLabels() {
        let axisOffset = HistogramStyles.axisOffset + HistogramStyles.axisLineWidth + 1
        var ctx = this.ctx
        ctx.save()
        //
        // x axis labels
        //
        
        // x axis name
        ctx.textAlign = "center"
        let xLabelX = (this.canvasWidth() - this.barStartX)/2
        let xLabelY = (this.canvasHeight()) - this.barStartY/2
        ctx.fillText("Intensity", xLabelX, xLabelY)   

        // min for x axis
        ctx.textAlign = "left"
        ctx.textBaseline = "top"
        let xMinLabelX = this.barStartX
        let xMinLabelY = this.canvasHeight() - this.barStartY + axisOffset
        ctx.fillText(this.model.xMin.toFixed(3), xMinLabelX, xMinLabelY)

        // max for x axis
        ctx.textAlign = "right"
        ctx.textBaseline = "top"
        let xMaxLabelX = this.canvasWidth()
        let xMaxLabelY = this.canvasHeight() - this.barStartY + axisOffset
        ctx.fillText(this.model.xMax.toFixed(3), xMaxLabelX, xMaxLabelY)

        ctx.restore()
        //
        // y axis labels
        //

        // y axis name
        ctx.save()
        ctx.textAlign = "center"
        let yLabelX = this.barStartX/2
        let yLabelY = (this.canvasHeight() - this.barStartY)/2
        ctx.translate(yLabelX, yLabelY)
        ctx.rotate(-Math.PI/2.0)
        ctx.fillText("Frequency",0,0)
        ctx.restore()

        // min for y axis
        ctx.save()
        ctx.textAlign = "left"
        ctx.textBaseline = "bottom"
        let yMinLabelX = this.barStartX - axisOffset
        let yMinLabelY = this.canvasHeight() - this.barStartY
        ctx.translate(yMinLabelX, yMinLabelY)
        ctx.rotate(-Math.PI/2.0)
        ctx.fillText(this.model.yMin,0,0)
        ctx.restore()

        // max for y axis
        ctx.save()
        ctx.textAlign = "right"
        ctx.textBaseline = "bottom"
        let yMaxLabelX = this.barStartX - axisOffset
        let yMaxLabelY = 0
        ctx.translate(yMaxLabelX, yMaxLabelY)
        ctx.rotate(-Math.PI/2.0)
        ctx.fillText(this.model.yMax,0,0)
        ctx.restore()
        
    }
    renderAxis() {
        // offset for x & y axis should be axis line width
        let lineWidth = HistogramStyles.axisLineWidth
        let offsetX = lineWidth
        let offsetY = lineWidth

        // define start and end points for axis
        let basePoint = [this.barStartX-offsetX, this.canvasHeight() - this.barStartY+offsetY]
        let xAxisEndPoint = [this.canvasWidth()-offsetX, this.canvasHeight() - this.barStartY+offsetY]
        let yAxisEndPoint = [this.barStartX-offsetX, 0+offsetY]

        // define axis with start and and points
        let xAxis = [basePoint, xAxisEndPoint]
        let yAxis = [basePoint, yAxisEndPoint]
        this.drawLines([xAxis, yAxis],[0,0,0],1)
    }
    generateLines(model) {
        // calculate the width of each bin
        let offset = (this.canvasWidth() - this.barStartX)/model.nBins
        let lines = new Array()
        for(let i = 0; i < model.pBarsHeight.length; i++) {
            // generate vertex coordinates with generateRectangleVertexPoints()
            lines = lines.concat(this.generateRectangleVertexPoints(i, offset, model.pBarsHeight[i]))
        }
        return lines
    }
   
    generateRectangleVertexPoints(i, offset, pHeight) {
        let barsViewHeight = this.canvasHeight()-this.barEndY-this.barStartY
        return [
            //
            // triangle 1
            //
            // lower left
            i*offset, 0, 
            // lower right
            (i+1)*offset, 0,
            // upper left
            i*offset, barsViewHeight*pHeight,

            // triangle 2
            // lower right
            (i+1)*offset, 0,
            // upper right
            (i+1)*offset, barsViewHeight*pHeight,
            // upper left
            i*offset, barsViewHeight*pHeight
        ]
    }
    
    highlight(barIndexList) {
        let lines = new Array()
        for(var i = 0; i < barIndexList.length; i++) {
            lines = lines.concat(this.generateRectangleVertexPoints(barIndexList[i], (this.canvasWidth() - this.barStartX)/this.model.nBins, this.model.pBarsHeight[barIndexList[i]]))
        }
        this.render2d(new Float32Array(lines), {xMin: -this.barStartX, yMin: -this.barStartY, xMax: this.canvasWidth(), yMax: this.canvasHeight() - this.barStartY}, [0,0,0,1], this.gl.TRIANGLES)
    }
    displayBarInfo(barIndexList) {
        // calcaulte start, end, sum, p_sum
        let start = (this.model.range * barIndexList[0]).toFixed(3)
        let end = (this.model.range * (barIndexList[barIndexList.length-1]+1)).toFixed(3)
        let p_sum = 0
        let sum = 0
        for(var i = 0; i < barIndexList.length; i++) {
            sum += this.model.bars[barIndexList[i]]
            p_sum += this.model.p[barIndexList[i]]
        }

        sum = sum
        p_sum = p_sum.toFixed(3)

        var ctx = this.ctx
        ctx.clearRect(this.barStartX*2, 0, this.canvasWidth(), this.barEndY)
        ctx.save()
        //
        // selected bar info label
        //
        ctx.textAlign = "right"
        ctx.textBaseline = "top"
        let labelX = this.canvasWidth()
        let labelY = 0
        let labelText = 
        "f[" + 
        start + 
        ", " +
        end + 
        ") = " +
        sum + 
        ", P = " +
        p_sum

        ctx.fillText(labelText, labelX, labelY)   
        ctx.restore()

    }
    getMinY() {
        return this.model.yMin
    }
    getMaxY() {
        return this.model.yMax
    }

}
