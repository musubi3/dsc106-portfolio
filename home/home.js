import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

async function displayLatestProjects() {
  const projects = await fetchJSON('./lib/projects.json');

  if (projects) {
    const latestProjects = projects.slice(0, 3);
    const projectsContainer = document.querySelector('.projects');

    if (projectsContainer) {
      renderProjects(latestProjects, projectsContainer, 'h3');
    }
  }
}

async function displayGitHubStats() {
  const githubData = await fetchGitHubData();
  const statsContainer = document.querySelector('#profile-stats');

  if (githubData && statsContainer) {
    statsContainer.innerHTML = `
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      </dl>
    `;
  }
}

async function updateProjectCount() {
  const projects = await fetchJSON('./lib/projects.json');

  const countElement = document.getElementById('project-count')

  if (countElement) {
    countElement.textContent = `${projects.length}+`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await displayLatestProjects();
  await displayGitHubStats();
  await updateProjectCount();
});