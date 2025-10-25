import { fetchJSON, renderProjects } from "../global.js";

async function main() {
    const projectsContainer = document.querySelector('.projects');
    const projects = await fetchJSON('../lib/projects.json');

    if (projects && projectsContainer) {
        renderProjects(projects, projectsContainer);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await main();
});