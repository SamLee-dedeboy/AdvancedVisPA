# PA1 Data and Histogram
All baseline requirements are implemented. This file describes some additional functionalities that I add to improve user interaction. 

## 1. Range Slider
A range slider is added below the histogram to let user choose the amount of bins on histogram. The minimum and maximum of bins are fixed, from 10 to 255. When user drags the slider, the histogram should display the according amount of bins instantly. 

The core part of range slider is defined in `MyRangeSlider.js`. The range slider actually contains three elements in the container widget: (1) title label, (2) range slider, (3) value label. When the range slider is dragged, in addition to changing the value label, `HistogramView` needs to rerender as well. To make sure `MyRangeSlider` and `HistogramView` are independent, this 'messaging' process is defined in `App.js`, as the following:
```javascript
// App.js
var self = this;
self.nBinSlider.getSlider().addEventListener('input', function(e) {
    if(self.readBinary == true) {
        self.histogramView.set(new HistogramModel(self.data, this.value))
        self.histogramView.render()	
    }
})
```
As you can see in the code above, `histogramView` will need to render everytime `input` event is triggered, which can seriously affect the performance. If the histogramView is rendered to often, the web page will become laggy. To reduce the lag, range slider has `step` set to 5, and can be higher if it's still laggy. 

## 2. Selecting bars
In addition to let the bars turn color when user's mouse hovers on it, which shows only one bar, I want the user to be able to select a group of bars, and the labels should show the statistics of the group of bars, so that users can get a better understanding of the histogram. For example, they can easily find out which range will consist of 50% of the data, or the total percentage of the two highest bars. 

The interaction is designed intuitively. Just click on a bar, hold the click, and move left or right, and release, just like selecting files on the desktop. The displayed statistic of the selected bars will be the range of all the selected bars, and the amount of their sum and proportional sum. To unselect, click on the empty area of histogram.
