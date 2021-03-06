
//Get svg and fitting parameters
var width = 1160;
var height = 720;
var factor = 1.1;
/*
function scale (scaleFactor,width,height) {
return d3.geoTransform({
	point: function(x, y) {
		this.stream.point( (x - width/2) * scaleFactor + 3*width/5 , (y - height/2) * scaleFactor + 3*height/5);
	}
});
}
*/

var path = d3.geoPath().projection(scale(factor,width,height));

var svg = d3.select("#map")
	.append("svg")
	.attr("width", width)
	.attr("height", height);

tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);


d3.csv("covid_us_counties.csv").then(function(data) {
	d3.json("https://d3js.org/us-10m.v1.json").then(function(us) {
		
	  //Draw counties, county-borders and state-borders
	  var counties = topojson.feature(us, us.objects.counties);
	  
	  //Define glow filter to soften map
		
	  var defs = svg.append("defs");

	  //Filter for the outside glow
	  var filter = defs.append("filter")
		.attr("id","glow");
	  filter.append("feGaussianBlur")
		.attr("stdDeviation","0.6")
		.attr("result","coloredBlur");
	  var feMerge = filter.append("feMerge");
	  feMerge.append("feMergeNode")
		.attr("in","coloredBlur");
	  feMerge.append("feMergeNode")
		.attr("in","SourceGraphic");
		
	  var filterb = defs.append("filterb")
		.attr("id","glowb");
	  filterb.append("feGaussianBlur")
		.attr("stdDeviation","2.0")
		.attr("result","coloredBlur");
	  var feMergeb = filterb.append("feMerge");
	  feMerge.append("feMergeNode")
		.attr("in","coloredBlur");
	  feMerge.append("feMergeNode")
		.attr("in","SourceGraphic");
	  
	  data.forEach(function(d) {
			d.date = String(d.date);
			d.fips = +d.fips;
			d.cases = +d.cases;
			d.deaths = +d.deaths;
			d.county = d.county;
			d.state = d.state;
		});
		
	  var dataByCountyByDate = d3.nest()
			.key(function(d) { return d.fips;})
			.key(function(d) { return d.date; })
			.map(data);
	  window.dataByCountyByDate_g = dataByCountyByDate
	  console.log(dataByCountyByDate);
	  
	  var maxdate = d3.max(data, function(d){return d.date;});
	  console.log(maxdate);
	  console.log(typeof maxdate);
	  maxDate = "$"+maxdate;
	  
	  var mindate = d3.min(data, function(d){return d.date;});
	  console.log(mindate);
	  console.log(typeof mindate);
	  minDate = "$"+mindate;
	  
	  var maxCases = d3.max(data, function(d){return d.cases;});
	  
	  var maxDeaths = d3.max(data, function(d){return d.deaths;});
	  
	  color = d3.scaleLinear()
		.domain([0, Math.log(maxCases+1)])
		.range(["blanchedalmond", "firebrick"]);
		
		
	  counties.features.forEach(function(county) {
			county.properties.dates = dataByCountyByDate["$"+String(+county.id)];
		});
	  
	  county_count = 0;
	  popdotsWithCases = [];
	  window.remember_polygon = [];
	  counties.features.forEach(function(county) {
		  county_count=county_count+1;
		  //if (county_count%500 == 0) {
			remember_polygon = [];
			popdots_here = [];
			//console.log(county);
			county.geometry.coordinates.forEach(function(edge) {
				edge.forEach(function(point) {
					remember_polygon.push(point);
				});
			});
			
			popdots_here = makeDots(remember_polygon, 100);
			
			popdots_here.forEach(function(d) { 
				popdot = d; 
				if (typeof county.properties.dates !== 'undefined' && typeof county.properties.dates[maxDate] !== 'undefined') {
					popdot.push(county.properties.dates[maxDate][0].cases);
				}
				else {popdot.push(0);}
				popdotsWithCases.push(popdot);
			});
			
			//reset remember_polygon to coords just for debugging
			remember_polygon = county.geometry.coordinates;
			
			if (county_count%500==0) {
			console.log("county populated with " + String(popdots_here.length) + " dots");
			console.log(String(county_count) + " counties populated");
			}
		  //}
		  //else {county.properties.popdots = [[]];}
		});
		
	  console.log("All counties populated");
	  
	  console.log("Now drawing and coloring...");
	  
	  var nonData_counties = [];
	  
	  var countyShapes = svg.append("g")
		.attr("class", "counties")
		.selectAll("path")
		.data(counties.features)
		.enter()
		.append("path")
		.attr("d", path)
		.style("fill", function(d) {
			if ((typeof d.properties.dates !== 'undefined') && (typeof d.properties.dates[maxDate] !=='undefined')) {
				//console.log(d.id);
				//console.log(d.properties.dates);
				return "none";
				//return color(Math.log(d.properties.dates[maxDate][0].cases + 1));
			}
			else {return d3.rgb("cornsilk");
			}
		})
		.style("fill-opacity", 0.2);  
		
	   svg.append("g")
		  .attr("class", "popdots")
		  .selectAll("path")
		  .data(popdotsWithCases)
		  .enter().append("circle")
		  .attr("r", 0.4)
		  .attr("transform", function(d) {
			  return "translate(" + [d[0], d[1]] + ")";
			})
		  //.attr("cx", function(d) {return d[0];})
		  //.attr("cy", function(d) {return d[1];})
		  //.style("fill", "firebrick")
		  .style("fill", function(c) {return color(Math.log(c[2]+1));})
		  .style("fill-opacity", 0.7);
	  
	  d3.selectAll(".counties")
		.style("filterb", "url(#glowb)");
	  
	  svg.select("g").append("path")
		 .attr("class", "county-borders")
		.attr("d", path(topojson.mesh(us, us.objects.counties, function(a, b) { return a !== b; })))
		.style("filter", "url(#glow)");
		
	  svg.select("g").append("path")
		 .attr("class", "state-borders")
		.attr("d", path(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; })))
		.style("filter", "url(#glow)");
		
		
		
		
	  //Handle zoom
	  const g = svg.selectAll("g");
	  var zoom = d3.zoom()
		  .scaleExtent([1, 8])
		  .on('zoom', function() {
			  g.selectAll('path')
			   .attr('transform', d3.event.transform);
	  });

	svg.call(zoom);
	
	//Handle unzoom
	$("#Reset").click(() => {
    gElem.transition()
		.duration(750)
		.call(zoom.transform, d3.zoomIdentity);
	});
		
		
	  //Apply glow filter
	  d3.selectAll(".counties")
		.style("filterb", "url(#glowb)");

	  d3.selectAll(".county-borders")
		.style("filter", "url(#glow)");
		
	  d3.selectAll(".state-borders")
		.style("filter", "url(#glow)");


	  var countFound = 0;
	  var countTotal = 0;
	  var countUnfound = 0;
	  var unfoundCounties = [];
	  counties.features.forEach(function(county) {
		  countTotal = countTotal+1;
		  if (typeof dataByCountyByDate["$"+county.id] !== 'undefined') {
			  unfoundCounties.push(county.id);
		  countFound = countFound+1; }
	  else { countUnfound=countUnfound+1; }});
	  
	  unfoundCounties = unfoundCounties.sort();
	  //unfoundCounties.forEach(function(c) {console.log(c);});
	  console.log("Number of counties found in data: "+String(countFound));
	  console.log("Number of counties not found in data: "+String(countUnfound));
	  console.log("Sum "+String(countFound+countUnfound)+" compared to "+String(countTotal));
	  
	  countyShapes
			.on("mouseover", function(d) {
				tooltip.transition()
				.duration(250)
				.style("opacity", 0.6);
				if ((typeof d.properties.dates !== 'undefined') && (typeof d.properties.dates[maxDate] !=='undefined')) {
					var county = d.properties.dates[maxDate][0].county;
					var state = d.properties.dates[maxDate][0].state;
					var cases =  d.properties.dates[maxDate][0].cases;
					var deaths = d.properties.dates[maxDate][0].deaths;
					var death_frac = 0.0;
					if (deaths > cases) {deaths=cases; console.log("wtf...deaths>cases")}
					if (cases==0) {var death_frac = 0.0;}
						else {death_frac = 100*deaths/cases;}
					tooltip.html("<g>"+
						"<p><strong>" + d.properties.dates[maxDate][0].county + ", " + d.properties.dates[maxDate][0].state + "</strong></p>" +
						"<table><tbody><tr><td class='wide'>Cases:</td><td>" + cases + "</td></tr>" +
						"<tr><td>Deaths:</td><td>" + deaths + "</td></tr>" +
						"<tr><td>Death Percent:</td><td>" + parseFloat(death_frac).toFixed(2)+"%" + "</td></tr></tbody></table>" +"</g>"
					)
					.style("left", (d3.event.pageX + 15) + "px")
					.style("top", (d3.event.pageY - 28) + "px");
				}
				else {
					tooltip.html("<g>"+
						"<p>No Cases Reported</p>"
					)
					.style("left", (d3.event.pageX + 15) + "px")
					.style("top", (d3.event.pageY - 14) + "px");
				}
			})
			.on("mouseout", function(d) {
				tooltip.transition()
				.duration(250)
				.style("opacity", 0);});
	}); //Closing ds.json(...)
}); //Closing d3.csv(...)

// the following block is new, adding JS events
  let hoverEnabled = false;
  svg.on('mousedown', x => hoverEnabled = true)
    .on('mouseup', x => hoverEnabled = false)
  svg.selectAll('.counties path').on('mouseover', function() {
    if (hoverEnabled) {
      this.classList.add('hovered');
    }
  });
  
function makeDots(polygon, numPoints, options) { 

  options = Object.assign({
    // DEFAULT OPTIONS:
    maxIterations: numPoints * 50,
    distance: null, // by default: MIN(width, height) / numPoints / 4,
    edgeDistance: null
  },options);

  numPoints = Math.floor(numPoints)

  // calculate bounding box
  
  let xMin = Infinity,
    yMin = Infinity,
    xMax = -Infinity,
    yMax = -Infinity
  
  polygon.forEach(p => {
    if (p[0]<xMin) xMin = p[0]
    if (p[0]>xMax) xMax = p[0]
    if (p[1]<yMin) yMin = p[1]
    if (p[1]>yMax) yMax = p[1]
  });

  let width = xMax - xMin
  let height = yMax - yMin
  
  // default options depending on bounds
  
  options.distance = options.distance || Math.min(width, height) / numPoints / 4
  options.edgeDistance = options.edgeDistance || options.distance
  
  // generate points
  
  let points = [];
  
  outer:
  for (let i=0; i<options.maxIterations; i++) {
    let p = [xMin + Math.random() * width, yMin + Math.random() * height]
    if (d3.polygonContains(polygon, p)) {
      points.push(p);
      }
	else {continue outer;}

    if (points.length == numPoints) break;
    }
  
  points.complete = (points.length >= numPoints)
  
  return points
}
