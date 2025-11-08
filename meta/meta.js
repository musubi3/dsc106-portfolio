import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { GITHUB_USER } from '../global.js';

let xScale, yScale, commits;

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

function renderScatterPlot(data, commits) {
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

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totallines);

    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const sortedCommits = d3.sort(commits, (d) => -d.totallines);
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totallines))
        .attr('fill', d => d3.interpolateRgb('#4a82fcff', '#ff8a00')(d.hourFrac / 24))
        .style('fill-opacity', 0.7)

        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);

            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
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

    time.textContent = commit.datetime?.toLocaleString('en', {
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

async function main() {
    let data = await loadData();
    commits = processCommits(data);

    renderCommitInfo(data, commits);
    renderScatterPlot(data, commits);

    const svg = d3.select('#chart svg');
    createBrushSelector(svg);
    renderLanguageBreakdown(null);
}

document.addEventListener('DOMContentLoaded', main);