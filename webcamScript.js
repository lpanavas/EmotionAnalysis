const video = document.getElementById("video");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
]).then();
var detectionTotal = [];
function startVideo() {
  detectionTotal = [];
  if (document.querySelector("svg")) {
    document.querySelector("svg").remove();
  }

  navigator.mediaDevices
    .getUserMedia({
      video: true,
    })
    .then(
      (stream) => (video.srcObject = stream),
      (err) => console.log(err)
    );
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    outOfCamera = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
    };
    var x = Date();

    if (detections.length === 0) {
      detectionTotal.push({
        time: x,
        emotions: outOfCamera,
      });
    } else if (detections.length === 1) {
      detectionTotal.push({
        time: x,
        emotions: detections[0].expressions,
      });
    } else {
      smallTotal = [];
      for (let y of detections) {
        smallTotal.push({
          time: x,
          emotions: y.expressions,
        });
      }
      const workD = workData(smallTotal);
      const sumValues = sumEmotions(workD);

      const finalValues = sumValues.series.map((d) => {
        sendValues = {
          neutral: 0,
          happy: 0,
          sad: 0,
          angry: 0,
          fearful: 0,
          disgusted: 0,
          surprised: 0,
        };
        return sendValues;
      });
    }
    // console.log(detectionTotal);
  }, 100);
});

function stopVideo() {
  document.querySelector("canvas").remove();
  video.pause();
  const dTotal = detectionTotal;
  const finalData = workData(dTotal);
  const sumData = sumEmotions(finalData);

  createTimelapse(finalData);
  createBarChart(sumData);
}

const workData = (data) => {
  console.log("data", data);
  series = [];
  dates = [];
  angry = [];
  disgusted = [];
  fearful = [];
  happy = [];
  neutral = [];
  sad = [];
  suprised = [];
  times = [];
  newData = {};
  data.map((d) => {
    angry.push(d.emotions.angry);
    disgusted.push(d.emotions.disgusted);
    fearful.push(d.emotions.fearful);
    happy.push(d.emotions.happy);
    neutral.push(d.emotions.neutral);
    sad.push(d.emotions.sad);
    suprised.push(d.emotions.surprised);
    times.push(new Date(d.time));
  });
  series.push({
    name: "angry",
    values: angry,
  });
  series.push({
    name: "disgusted",
    values: disgusted,
  });
  series.push({
    name: "fearful",
    values: fearful,
  });
  series.push({
    name: "happy",
    values: happy,
  });
  series.push({
    name: "neutral",
    values: neutral,
  });
  series.push({
    name: "sad",
    values: sad,
  });
  series.push({
    name: "suprised",
    values: suprised,
  });
  newData.dates = times;

  newData.series = series;
  return newData;
};

const sumEmotions = (data) => {
  var sumData = data.series.reduce(function (result, d) {
    let currentData = result[d.name] || {
      name: d.name,
      values: d.values.reduce(getSum, 0),
    };

    result[d.name] = currentData;
    return result;
  }, {});

  function getSum(total, num) {
    return total + num;
  }

  sumData = Object.keys(sumData).map((key) => sumData[key]);
  sumData = sumData.sort((a, b) => {
    return b.values - a.values;
  });
  sumValues = {};
  sumValues.series = sumData;
  sumValues.dates = data.dates;
  return sumValues;
};

const createTimelapse = (data) => {
  var width = 700;
  var height = 600;
  svg = d3
    .select("#emotionTimelapse")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("style", "border: solid 1px black");

  let timeExtent = d3.extent(data.dates);

  let yScale = d3.scaleLinear().range([0, 200]).domain([1, 0]);
  let yAxis = d3.axisLeft(yScale);
  let xScale = d3.scaleTime().range([0, 400]).domain(timeExtent);

  var res = newData.series.map(function (d) {
    return d.name;
  }); // list of group names

  var color = d3
    .scaleOrdinal()
    .domain(res)
    .range([
      "#e41a1c",
      "#377eb8",
      "#4daf4a",
      "#984ea3",
      "#ff7f00",
      "#ffff33",
      "#a65628",
    ]);

  let xAxis = d3
    .axisBottom(xScale)
    .ticks(5)
    .tickFormat(d3.timeFormat("%I:%M:%S"));

  svg.append("g").call(yAxis).attr("transform", "translate(30,200)");
  svg.append("g").call(xAxis).attr("transform", "translate(30,400)");

  line = d3
    .line()

    .x((d, i) => xScale(newData.dates[i]))
    .y((d) => yScale(d));
  // .curve(d3.curveMonotoneX);

  const path = svg
    .append("g")
    .attr("fill", "none")

    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(newData.series)
    .join("path")
    .style("mix-blend-mode", "multiply")
    .attr("d", (d) => line(d.values))
    .attr("transform", "translate(30,200)")
    .attr("stroke", function (d) {
      return color(d.name);
    });

  svg
    .selectAll("mydots")
    .data(data.series)
    .enter()
    .append("circle")
    .attr("cx", 520)
    .attr("cy", function (d, i) {
      return 200 + i * 25;
    }) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 7)
    .style("fill", function (d) {
      return color(d.name);
    });

  // Add one dot in the legend for each name.
  svg
    .selectAll("mylabels")
    .data(data.series)
    .enter()
    .append("text")
    .attr("x", 540)
    .attr("y", function (d, i) {
      return 200 + i * 25;
    }) // 100 is where the first dot appears. 25 is the distance between dots
    .style("fill", function (d) {
      return color(d.name);
    })
    .text(function (d) {
      return d.name;
    })
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");
};

const createBarChart = (data) => {
  console.log(data);
  var width = 700;
  var height = 600;
  var res = data.series.map(function (d) {
    return d.name;
  }); // list of group names

  var color = d3
    .scaleOrdinal()
    .domain(res)
    .range([
      "#e41a1c",
      "#377eb8",
      "#4daf4a",
      "#984ea3",
      "#ff7f00",
      "#ffff33",
      "#a65628",
    ]);
  svg = d3
    .select("#totalBarChart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("style", "border: solid 1px black");
  let max = d3.max(data.series, (d) => d.values);
  console.log("max", max);
  let scaleEmotion = d3.scaleLinear().range([0, 200]).domain([0, max]);
  let yScale = d3.scaleLinear().range([0, 400]).domain([max, 0]);
  let xScale = d3
    .scaleBand()
    .range([0, 400])
    .domain(data.series.map((d) => d.name))
    .padding(0.1);

  svg
    .selectAll("rect")
    .data(data.series)
    .enter()
    .append("rect")
    .attr("height", (d) => scaleEmotion(d.values))
    .attr("width", xScale.bandwidth())
    .attr("x", (d) => xScale(d.name))
    .attr("transform", "translate(100,300) scale (1, -1)")
    .style("fill", function (d) {
      return color(d.name);
    });

  svg
    .selectAll("mydots")
    .data(data.series)
    .enter()
    .append("circle")
    .attr("cx", 520)
    .attr("cy", function (d, i) {
      return 200 + i * 25;
    }) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 7)
    .style("fill", function (d) {
      return color(d.name);
    });

  // Add one dot in the legend for each name.
  svg
    .selectAll("mylabels")
    .data(data.series)
    .enter()
    .append("text")
    .attr("x", 540)
    .attr("y", function (d, i) {
      return 200 + i * 25;
    }) // 100 is where the first dot appears. 25 is the distance between dots
    .style("fill", function (d) {
      return color(d.name);
    })
    .text(function (d) {
      return d.name;
    })
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");
};
