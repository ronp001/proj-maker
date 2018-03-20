[![Build Status](https://travis-ci.org/ronp001/proj-maker.svg?branch=master)](https://travis-ci.org/ronp001/proj-maker)

# TODO
* ~~S refuse to work in a pm-* branch~~
* ~~S create .pminfo.json in update too~~
* L 'pm continue': after the rebase has been finalized: copy the results to the original branch (need to save branch name in tmp file)
* L unit test for 'update':  try different merge options
* ~~L recognize git state:  bare (no commits yet), clean working directory, workdir with files, rebase/merge in progress~~
* ~~S abort if stash did not succeed (i.e., workdir state is not 'clean' after stash complete)~~
* L create the 'fcap styles' repository:  includes prototype projects and hygen templates dir

# proj-maker

This is an experiment in ...


## commands

* `proj-maker new <unit-type> <unit-name>` - creates a new unit called <unit-name>, 
using the <unit-type> generator.  

* `proj-maker convert [<version-num>|"latest"] [<unit-name>]` - converts the unit to the specified (or latest) version of the generator. If unit-name is not specified, assumes the unit is the current directory.
