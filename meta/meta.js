import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";
import { GITHUB_USER } from '../global.js';


let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
let xScale, yScale;
let commits = [];
let commitProgress = 100;
let timeScale;
let commitMaxTime;

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: `https://github.com/${GITHUB_USER}/dsc106-portfolio/commit/` + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totallines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                configurable: true,
                writable: true,
            });

            return ret;
        });
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    const numFiles = d3.group(data, (d) => d.file).size;
    dl.append('dt').text('Files');
    dl.append('dd').text(numFiles);

    const maxDepth = d3.max(data, (d) => d.depth);
    dl.append('dt').text('Max Depth');
    dl.append('dd').text(maxDepth);

    const longestLine = d3.max(data, (d) => d.length);
    dl.append('dt').text('Longest Line');
    dl.append('dd').text(longestLine);
}

function renderScatterPlot(commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // 1. Create SVG only if it doesn't exist
    let svg = d3.select('#chart svg');
    if (svg.empty()) {
        svg = d3.select('#chart')
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('overflow', 'visible');
    }

    // 2. Initialize Scales (Global)
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // 3. Gridlines
    const gridlines = svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // 4. Axes
    // Check if axes exist to avoid duplicates
    if (svg.select('.x-axis').empty()) {
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${usableArea.bottom})`);

        svg.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${usableArea.left}, 0)`)
            .call(d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'));
    }

    // 5. Dots Container
    if (svg.select('.dots').empty()) {
        svg.append('g').attr('class', 'dots');
    }
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length == 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });

    time.textContent = commit.time || commit.datetime?.toLocaleString('en', {
        timeStyle: 'short'
    });
    author.textContent = commit.author;
    lines.textContent = commit.totallines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const offset_Y = 7;
    const offset_X = offset_Y * 2;

    let x = event.clientX + offset_X;
    let y = event.clientY + offset_Y;

    const { innerWidth: ww, innerHeight: wh } = window;
    const rect = tooltip.getBoundingClientRect();
    if (x + rect.width + 8 > ww) x = ww - rect.width - 8;
    if (y + rect.height + 8 > wh) y = wh - rect.height - 8;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }

    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);

    const [
        [x0, y0],
        [x1, y1]
    ] = selection;

    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
}

function renderSelectionCount(selection) {
    const selectedCommits = selection ?
        commits.filter((d) => isCommitSelected(selection, d)) :
        [];

    const countElement = document.querySelector('#selection-count');
    const count = selectedCommits.length;
    countElement.textContent = `${count === 0 ? 'No' : count} commits selected`;

    return selectedCommits;
}

function renderLanguageBreakdown(selection) {
    const container = document.getElementById('language-breakdown');

    const selectedCommits = selection ?
        commits.filter((d) => isCommitSelected(selection, d)) :
        [];

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        container.hidden = true;
        return;
    }

    container.hidden = false;
    const lines = selectedCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
}

function brushed(event) {
    const selection = event.selection;

    d3.selectAll('circle').classed('selected', (d) =>
        isCommitSelected(selection, d)
    );

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function createBrushSelector(svg) {
    const brush = d3.brush()
        .on('start brush end', brushed);

    svg.call(brush);
    svg.selectAll('.dots, .overlay ~*').raise();
}

function updateScatterPlot(filteredCommits) {
    const svg = d3.select('#chart svg');
    if (filteredCommits.length === 0) return;

    // 1. Update Scale Domain (Zoom Effect)
    xScale.domain(d3.extent(filteredCommits, (d) => d.datetime));

    // 2. Redraw X-Axis with animation
    svg.select('.x-axis')
        .transition()
        .duration(200)
        .call(d3.axisBottom(xScale));

    // 3. Update Dots (Efficient D3 Pattern)
    const rScale = d3.scaleSqrt()
        .domain(d3.extent(filteredCommits, (d) => d.totallines))
        .range([2, 30]);

    const sortedCommits = d3.sort(filteredCommits, (d) => -d.totallines);

    svg.select('.dots')
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id) // Use commit ID as key!
        .join(
            (enter) => enter.append('circle')
                .attr('cx', (d) => xScale(d.datetime))
                .attr('cy', (d) => yScale(d.hourFrac))
                .attr('r', 0) // Animate in from 0
                .attr('fill', (d) => {
                    const hour = d.datetime.getHours();
                    const metric = d.datetime.getHours() + d.datetime.getMinutes() / 60;
                    return d3.interpolateRgb('#4a82fcff', '#ff8a00')(metric / 24);
                })
                .style('fill-opacity', 0.7)
                .call((enter) => enter.transition().duration(500).attr('r', (d) => rScale(d.totallines))),

            (update) => update
                .call((update) => update.transition().duration(200)
                    .attr('cx', (d) => xScale(d.datetime))
                    .attr('cy', (d) => yScale(d.hourFrac))
                    .attr('r', (d) => rScale(d.totallines))
                ),

            (exit) => exit
                .call((exit) => exit.transition().duration(200).attr('r', 0).remove())
        )
        // Re-attach hover events (since they might be lost on new elements)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
}

function updateFileVisualization(filteredCommits) {
    const lines = filteredCommits.flatMap((d) => d.lines);
    let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
        return { name, lines };
    });

    files = d3.sort(files, (d) => -d.lines.length);

    d3.select('.files').selectAll('div').remove();

    d3.select('dl#files')
        .selectAll('div.file-item')
        .data(files, d => d.name)
        .join('div')
        .attr('class', 'file-item')
        .attr('style', d => `--color:${fileTypeColors(d.lines[0].type)}`)
        .html(d => `
            <dt>
                <code>${d.name}</code>
                <small>${d.lines.length} lines</small>
            </dt>
            <dd>
                ${d.lines.map(line => `<div class="line"></div>`).join('')}
            </dd>
        `);
}

function scrollamaSetup() {
    const scroller = scrollama();

    scroller
        .setup({
            step: "#scrolly-1 .step",
            offset: 0.5,
            debug: false,
        })
        .onStepEnter((response) => {
            const commit = d3.select(response.element).datum();
            
            const filteredCommits = commits.filter(d => d.datetime <= commit.datetime);
            updateScatterPlot(filteredCommits);
            updateFileVisualization(filteredCommits); 

            d3.select("#scrolly-1").selectAll(".step").classed("is-active", false);
            d3.select(response.element).classed("is-active", true);
        });
}

async function main() {
    const data = await loadData();
    commits = processCommits(data);

    d3.select('#scatter-story')
        .selectAll('div')
        .data(commits)
        .enter()
        .append('div')
        .attr('class', 'step')
        .html(d => {
            return `
            <p>
                On ${d.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, I made
                <a href="${d.url}" target="_blank">${d.id}</a>. I edited ${d.totallines} lines across 
                ${d.lines.length} files.
            </p>
        `;
        });

    timeScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, 100]);

    renderCommitInfo(data, commits);
    renderScatterPlot(commits);

    const svg = d3.select('#chart svg');
    createBrushSelector(svg);
    renderLanguageBreakdown(null);
    scrollamaSetup();
}

document.addEventListener('DOMContentLoaded', main);