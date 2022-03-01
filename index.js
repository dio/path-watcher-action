const core = require('@actions/core');
const github = require('@actions/github');
const Octokit = require("@octokit/rest");
const minimatch = require('minimatch');

(async () => {
  const ghToken = core.getInput('github_token');
  const octokit = new Octokit(ghToken ? { auth: ghToken } : {});
  const paths = core.getInput('paths').split(',');
  const SHA = core.getInput('github_sha');

  const returnFiles = core.getInput('return_files') === 'true';
  // When using pull_request, the context payload.head_commit is undefined. But we have after instead.
  const ref = github.context.payload.head_commit ?
    github.context.payload.head_commit.id : (SHA || github.context.payload.after);

  if (!ref) {
    core.info('missing ref!');
    core.setOutput('modified', true);
    return;
  }

  core.info(`ref: ${ref}`);

  const [owner, repo] = github.context.payload.repository.full_name.split('/');
  const { data: { files }, err } = await octokit.repos.getCommit({ owner, repo, ref });
  if (err) {
    core.info(err);
    core.setOutput('modified', true);
    return;
  }

  if (Array.isArray(files)) {
    core.info(`go files ${files.length}`);
    const modifiedPaths = files.map(f => f.filename);
    if (!returnFiles) {
      const modified = paths.some(p => minimatch.match(modifiedPaths, p).length);
      core.info(`verdict: ${modified}`);
      core.setOutput('modified', modified);
      return;
    }
    const modified_files = paths.flatMap(p => minimatch.match(modifiedPaths, p));
    core.setOutput('modified', modified_files.length > 0);
    core.setOutput('modified_files', modified_files);
    return;
  }

  core.info('no relevant modified files');
  core.setOutput('modified', false);
})();
