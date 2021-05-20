const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    // Define the label to use to track changes
    const token = core.getInput('github-token');
    const changedLabelName = core.getInput('changed-label');
    const qualifyingLabelNames = core.getInput('qualifying-labels').split(',');
    const eventName = github.context.eventName;
    const actionName = github.context.action;

    // Check whether appropriate workflow triggers and actions
    if (!['issues', 'project_card'].includes(eventName)) {
      core.info(`Skipping since the workflow is only compatible with 'issues' and 'project_card' triggers.`);
      return;
    } else if ('issues' === eventName && !['edited', 'labeled', 'unlabeled'].includes(actionName)) {
      core.info(`Skipping since the workflow is only compatible with the 'edited', 'labeled', and 'unlabeled' actions for the 'issues' trigger.`);
      return;
    } else if ('project_card' === eventName && !['moved', 'deleted'].includes(actionName)) {
      core.info(`Skipping since the workflow is only compatible with the 'moved' and 'deleted' actions for the 'project_card' trigger.`);
      return;
    }

    // Pull from context
    const changes = github.context.payload.changes;
    const label = github.context.payload.label;
    const issue = github.context.payload.issue;
    const projectCard = github.context.payload.project_card;
    const repo = github.context.repo;

    // Check whether the card on the project board merely moved within a column and skip if so
    // Also check if the label being used to track changes was unlabeled and skip if so to avoid a loop
    // Also check if the qualifying labels were unlabeled or labeled and skip
    if (actionName == 'moved' && changes === undefined) {
      core.info(`Skipping since the card merely moved within the same project board column.`);
      return;
    } else if (actionName == 'unlabeled' && label === undefined) {
      // TODO: label.name fails if the unlabeled event action was triggered by the deletion of a label. Ideally this should be a valid scenario.
      core.warning(`Skipping since a label was removed because a label was deleted. Manual checks required.`);
      return;
    } else if (actionName == 'unlabeled' && label.name == changedLabelName) {
      core.info(`Skipping since the '${label.name}' label was removed.`);
      return;
    } else if (actionName == 'unlabeled' && qualifyingLabelNames.includes(label.name)) {
      core.info(`Skipping since the '${label.name}' exempt label was removed.`);
      return;
    } else if (actionName == 'labeled' && qualifyingLabelNames.includes(label.name)) {
      core.info(`Skipping since the '${label.name}' exempt label was applied.`);
      return;
    } else {
      core.info(`A '${eventName}.${actionName}' event action has been triggered.`);
    }
    
    // Get the issue number from the issue change or project board card change
    var issueNumber;
    if (issue !== undefined) {
      issueNumber = issue.number;
    } else if (
      projectCard !== undefined &&
      projectCard.content_url
    ) {
      issueNumber = projectCard.content_url.split("/").pop();
    } else {
      core.setFailed("Unable to determine issue number.");
      return;
    }
    
    // Get Octokit
    const octokit = github.getOctokit(token);

    // Check if at least one of the exempt label(s) are already on the issue
    const { data: existingLabels } = await octokit.issues.listLabelsOnIssue({
      issue_number: issueNumber,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      per_page: 100,
    });
    const match = existingLabels.filter(label => qualifyingLabelNames.includes(label.name));
    if (match.length !== undefined && match.length > 0) {
      core.info(`One or more of the '${qualifyingLabelNames.join()}' label(s) are on the issue.`);
    } else {
      core.info(`Skipping since the '${qualifyingLabelNames.join()}' label(s) are not on the issue.`);
      return; 
    }
    
    // Apply the label for tracking changes to the issue
    await octokit.issues.addLabels({
      issue_number: issueNumber,
      owner: repo.owner,
      repo: repo.repo,
      labels: [changedLabelName],
    });
    core.info(`The '${changedLabelName}' label was applied to issue #${issueNumber}.`);
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run();
