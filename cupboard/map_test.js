var svg = d3.select("svg");

var path = d3.geoPath();

queue()
	.defer(d3.json, "https://d3js.org/us-10m.v1.json")
	.defer(d3.csv, "covid_us_counties.csv")
	.await(ready);

function ready(error, us, data) {
  if (error) throw error;
  
  //Draw counties, county-borders and state-borders
  
  var counties = topojson.feature(us, us.objects.counties)
  
  var countyShapes = svg.append("g")
    .attr("class", "counties")
    .selectAll("path")
    .data(counties.features)
    .enter()
    .append("path")
    .attr("d", path);  
  
  svg.append("path")
     .attr("class", "county-borders")
    .attr("d", path(topojson.mesh(us, us.objects.counties, function(a, b) { return a !== b; })));
	
  svg.append("path")
     .attr("class", "state-borders")
    .attr("d", path(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; })));	
	
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
		d.date = d.date;
		d.fips = +d.fips;
		d.cases = +d.cases;
		d.deaths = +d.deaths;
	});
	
  var dataByCountyByDate = d3.nest()
		.key(function(d) { return d.fips; })
		.key(function(d) { return d.date; })
		.map(data);
	
  var maxDate = d3.max(data, function(d){return d.date;});
  
  counties.features.forEach(function(county) {
		county.properties.dates = dataByCountyByDate[+county.id]
	});
	
  countyShapes
		.on("mouseover", function(d) {
			tooltip.transition()
			.duration(250)
			.style("opacity", 0.7);
			tooltip.html(
			"<p><strong>" + d.properties.dates[maxDate][0].county + ", " + d.properties.dates[maxDate][0].state + "</strong></p>" +
			"<table><tbody><tr><td class='wide'>Cases:</td><td>" + d.properties.dates[maxDate][0].cases + "</td></tr>" +
			"<tr><td>Deaths:</td><td>" + d.properties.dates[maxDate][0].deaths + "</td></tr>" +
			"<tr><td>Death Percent:</td><td>" + formatPercent(d.properties.dates[maxDate][0].deaths/d.properties.dates[maxDate][0].cases) + "</td></tr></tbody></table>"
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



