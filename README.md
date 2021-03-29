# Issue change labeler

A GitHub Action to label an issue if it has been modified is some way.

<p align="center">
  <a href="https://github.com/alexcnichols/issue-change-labeler/actions"><img alt="issue-change-labeler status" src="https://github.com/alexcnichols/issue-change-labeler/workflows/unit-tests/badge.svg"></a>
</p>

---

## Usage

### Pre-requisites

Create a workflow `.yml` file in your repositories `.github/workflows` directory. An [example workflow](#example-workflow) is available below. For more information, reference GitHub Docs for [Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

### Inputs

- `changed-label`: Required. Default `changed`. The label to track that an issue has been changed.
- `qualifying-labels`: Optional. The comma-separated list of label(s) that must be on the issue already in order for changed labeling to trigger.

### Example workflow

```yaml
name: Issue change labeler

on:
  issues:
    types: [edited, labeled, unlabeled]
  project_card: 
    types: [moved, deleted]

jobs:
  issue-change-labeler:
    runs-on: ubuntu-latest
    steps:
      - name: Label issue if changed
        uses: alexcnichols/issue-change-labeler@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          changed-label: 'changed'
          qualifying-labels: 'reviewed'
```
