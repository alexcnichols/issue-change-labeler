const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    // Define the label to use to track changes
    const changedLabelName = core.getInput('changed-label');
    const qualifyingLabelNames = core.getInput('qualifying-labels').split(',');

    // Debugs
    core.debug(`github.context.payload.action: '${github.context.payload.action}'`);
    core.debug(`github.context.payload.changes: '${github.context.payload.changes}'`);
    core.debug(`github.context.payload.label.name: '${github.context.payload.label.name}'`);
    core.debug(`github.context.eventName: '${github.context.eventName}'`);
    //
    core.debug(`github.context.event_name: '${github.context.event_name}'`);
    core.debug(`github.context.changes: '${github.context.changes}'`);
    core.debug(`github.context.label: '${github.context.label}'`);
    core.debug(`github.context.action: '${github.context.action}'`);
    core.debug(`github.context.workflow: '${github.context.workflow}'`);
    // End debugs

    // Check whether appropriate workflow triggers
    if (!['issues', 'project_card'].includes(github.context.eventName)) {
      core.info(`Skipping since the workflow is only compatible with 'issues' and 'project_card' triggers.`);
      return;
    }

    // Check whether the card on the project board merely moved within a column and skip if so
    // Also check if the label being used to track changes was unlabeled and skip if so to avoid a loop
    // Also check if the qualifying labels were unlabeled or labeled and skip
    if (github.event.action == 'moved' && github.event.changes === undefined) {
      core.info(`Skipping since the card merely moved within the same project board column.`);
      return;
    } else if (github.event.action == 'unlabeled' && github.event.label.name == changedLabelName) {
      core.info(`Skipping since the '${github.event.label.name}' label was removed.`);
      return;
    } else if (github.event.action == 'unlabeled' && qualifyingLabelNames.includes(github.event.label.name)) {
      core.info(`Skipping since the '${github.event.label.name}' exempt label was removed.`);
      return;
    } else if (github.event.action == 'labeled' && qualifyingLabelNames.includes(github.event.label.name)) {
      core.info(`Skipping since the '${github.event.label.name}' exempt label was applied.`);
      return;
    } else {
      core.info(`A '${github.event_name}.${github.event.action}' event action has been triggered.`);
    }
    
    // Get the issue number from the issue change or project board card change
    var issueNumber;
    if (github.context.payload.issue !== undefined) {
      issueNumber = github.context.payload.issue.number;
    } else if (
      github.context.payload.project_card !== undefined &&
      github.context.payload.project_card.content_url
    ) {
      issueNumber = github.context.payload.project_card.content_url.split("/").pop();
    } else {
      core.setFailed("Unable to determine issue number.");
      return;
    }
    
    // Check if at least one of the exempt label(s) are already on the issue
    const { data: existingLabels } = await github.issues.listLabelsOnIssue({
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
    await github.issues.addLabels({
      issue_number: issueNumber,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      labels: [changedLabelName],
    });
    core.info(`The '${changedLabelName}' label was applied to issue #${issueNumber}.`);
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run();
