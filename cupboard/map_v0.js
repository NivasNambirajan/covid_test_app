var svg = d3.select("svg");

var path = d3.geoPath();

tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

queue()
	.defer(d3.json, "https://d3js.org/us-10m.v1.json")
	.await(ready);

function ready(error, us) {
  if (error) throw error;
  const data = await d3.csv("covid_us_counties.csv");
  //Draw counties, county-borders and state-borders
  var counties = topojson.feature(us, us.objects.counties)
  
  var countyShapes = svg.append("g")
    .attr("class", "counties")
    .selectAll("path")
    .data(counties.features)
    .enter()
    .append("path")
    .attr("d", path);  
  
  svg.select("g").append("path")
     .attr("class", "county-borders")
    .attr("d", path(topojson.mesh(us, us.objects.counties, function(a, b) { return a !== b; })));
	
  svg.select("g").append("path")
     .attr("class", "state-borders")
    .attr("d", path(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; })));	
	
	
  //Handle zooming
  const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', zoomed);
	
  //Define glow filter to soften map
	
  var defs = svg.append("defs");

  //Filter for the outside glow
  var filter = defs.append("filter")
    .attr("id","glow");
  filter.append("feGaussianBlur")
    .attr("stdDeviation","0.8")
    .attr("result","coloredBlur");
  var feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode")
    .attr("in","coloredBlur");
  feMerge.append("feMergeNode")
    .attr("in","SourceGraphic");
	
  //Apply glow filter
  d3.selectAll(".counties")
    .style("filter", "url(#glow)");

  d3.selectAll(".county-borders")
    .style("filter", "url(#glow)");
	
  d3.selectAll(".state-borders")
    .style("filter", "url(#glow)");
	

  //Massage data and make map data-driven
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
  var maxDate = d3.max(data, function(d){return d.date;});
  console.log(maxDate);
  console.log(typeof maxDate);
  
  counties.features.forEach(function(county) {
	    //console.log(county.properties);
	    //console.log("considering fips "+county.id);
		//console.log(dataByCountyByDate[+county.id]);
		county.properties.dates = dataByCountyByDate["$"+String(+county.id)];
		//console.log(county.properties);
	});

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
  unfoundCounties.forEach(function(c) {console.log(c);});
  console.log("Number of counties found in data: "+String(countFound));
  console.log("Number of counties not found in data: "+String(countUnfound));
  console.log("Sum "+String(countFound+countUnfound)+" compared to "+String(countTotal));
  
	  
  maxDate = "$"+maxDate;
  countyShapes
		.on("mouseover", function(d) {
			tooltip.transition()
			.duration(250)
			.style("opacity", 0.6);
			console.log(d);
			console.log(d.properties);
			console.log(d.properties.dates[maxDate][0].county);
			console.log(d.properties.dates[maxDate][0].cases);
			console.log(typeof d.properties.dates[maxDate][0].cases);
			var cases =  d.properties.dates[maxDate][0].cases;
			var deaths = d.properties.dates[maxDate][0].deaths;
			var death_frac = 0.0;
			if (deaths > cases) {deaths=cases; console.log("wtf...deaths>cases")}
			if (cases==0) {var death_frac = 0.0;}
				else {death_frac = deaths/cases;}
			tooltip.html(
			"<p><strong>" + d.properties.dates[maxDate][0].county + ", " + d.properties.dates[maxDate][0].state + "</strong></p>" +
			"<table><tbody><tr><td class='wide'>Cases:</td><td>" + cases + "</td></tr>" +
			"<tr><td>Deaths:</td><td>" + deaths + "</td></tr>" +
			"<tr><td>Death Percent:</td><td>" + parseFloat(death_frac).toFixed(2)+"%" + "</td></tr></tbody></table>"
			)
			.style("left", (d3.event.pageX + 15) + "px")
			.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout", function(d) {
			tooltip.transition()
			.duration(250)
			.style("opacity", 0);
  });
};

// the following block is new, adding JS events
  let hoverEnabled = false;
  svg.on('mousedown', x => hoverEnabled = true)
    .on('mouseup', x => hoverEnabled = false)
  svg.selectAll('.counties path').on('mouseover', function() {
    if (hoverEnabled) {
      this.classList.add('hovered');
    }
  });