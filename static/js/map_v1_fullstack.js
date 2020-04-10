
//Get svg and fitting parameters
var width = 1160;
var height = 720;
var factor = 1.1;


//Function to scale and center map. Pain to deal with for scattering points on map - figure it out or replace.
function scale (scaleFactor,width,height) {
return d3.geoTransform({
	point: function(x, y) {
		this.stream.point( (x - width/2) * scaleFactor + 3*width/5 , (y - height/2) * scaleFactor + 3*height/5);
	}
});
}


var path = d3.geoPath().projection(scale(factor, width, height));


var svg = d3.select("#map")
	.append("svg")
	.attr("width", width)
	.attr("height", height);

tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

//Get FIPS codes for NYC counties: Kings, Queens, Bronx, NY, Richmond
var nyc_counties = [36047, 36081, 36005, 36061, 36085]

mapCovid(covidData, popData);



function mapCovid(data, pop_data) {
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
		
	  pop_data.forEach(function(d) {
			d.population = +d.population;
			d.fips = +d.fips;
	  });
	  
	  console.log("population data successfully accessed once");
	  var dataByCountyByDate = d3.nest()
			.key(function(d) { return d.fips;})
			.key(function(d) { return d.date; })
			.map(data);
			
	  var popByCounty = d3.nest()
			.key(function(d) {return d.fips;})
			.map(pop_data);
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
			//Check for NYC
			if (nyc_counties.includes(+county.id)) {
			county.properties.dates = dataByCountyByDate["$7777777"]; }
			
			//continue normally otherwise
			else {
			county.properties.dates = dataByCountyByDate["$"+String(+county.id)];}
			
			//Not all counties have their population in the data by design. So handle this here.
			//NYC counties will be dropped from this by design, so check for them separately below
			// Assume NYC has been separately keyed with FIPS 7777777 in the population data upstream.
			if (typeof popByCounty["$"+String(+county.id)] == 'undefined') {
				if (nyc_counties.includes(+county.id)) {county.properties.population = popByCounty["$"+String(7777777)][0].population;}
				else {
				county.properties.population = 0;}
				}
			else {
				county.properties.population = popByCounty["$"+String(+county.id)][0].population;
				console.log("Found population: " + String(county.properties.population));
			}
		});
	  
	  
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
				//return "none";
				return color(Math.log(d.properties.dates[maxDate][0].cases + 1));
			}
			else {return d3.rgb("cornsilk");
			}
		})
		.style("fill-opacity", 0.8);  
	  
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
					var pop = d.properties.population;
					tooltip.html(tooltipContent(county, state, cases, deaths, pop)
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
} //Closing mapCovid(...)

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

function tooltipContent(county, state, cases, deaths, pop) {
	var death_frac = 0.0;
	if (deaths > cases) {deaths=cases; console.log("wtf...deaths>cases")}
	if (cases==0) {var death_frac = 0.0;}
		else {death_frac = 100*deaths/cases;}
	if (state !== 'Alaska') {
		return "<g>"+
				"<p><strong>" + county + ", " + state + "</strong></p>" +
				"<table><tbody><tr><td class='wide'>Cases:</td><td>" + numberWithCommas(cases) + "</td></tr>" +
				"<tr><td>Deaths:</td><td>" + numberWithCommas(deaths) + "</td></tr>" +
				"<tr><td>Death Percent:</td><td>" + parseFloat(death_frac).toFixed(2)+"%" + "</td></tr>" + 
				"<tr><td>Population:</td><td>" + numberWithCommas(pop) + "</td></tr></tbody></table>" + 
				"<p>One Case Every " + numberWithCommas(Math.round(pop/cases)) + " people" + "</p></g>";
	}
	else {
		return "<g>"+
				"<p><strong>" + county + ", " + state + "</strong></p>" +
				"<table><tbody><tr><td class='wide'>Cases:</td><td>" + numberWithCommas(cases) + "</td></tr>" +
				"<tr><td>Deaths:</td><td>" + numberWithCommas(deaths) + "</td></tr>" +
				"<tr><td>Death Percent:</td><td>" + parseFloat(death_frac).toFixed(2)+"%" + "</td></tr>" + 
				"</tbody></table>";
	}
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
