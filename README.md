<!-- [![Build Status](https://travis-ci.org/ronp001/proj-maker.svg?branch=master)](https://travis-ci.org/ronp001/proj-maker) -->

# proj-maker

---
## WARNING: this is an experimental tool which performs potentially dangerous operations on git repositories and was not heavily tested. Use at your own risk, and be very careful when using it.
---

## background

Imagine the following scenario:
* you use a code generator (e.g., one created with [hygen](http://www.hygen.io/)) to generate a unit
* you modify the auto-generated code
* a new version of the generator is released. 
* now what? if you run the new version of the generator, you lose all your changes.  how do you benefit from the new generator in the existing project?

`proj-maker` is a utility for experimenting with an idea about use `git` in conjuction with `hygen` in order to "reapply" the new version of the generator on the existing project, so that you can use the new generator while keeping the changes 
you made to the code created by the old generator.

For some more background see the [evolving templates](https://github.com/jondot/hygen/issues/16) discussion in the `hygen` project.

## how it works


the key concept to this tool's 'code regeneration' mechanism is based on performing several `branching` and `rebasing` operations as follows:

When running the generator for the first time (assuming we're working in `master`), store all of its outputs in a single commit, e.g.: 
```
o---V1---A-...--o---N  (master)
    ^
    |
  all of the code created by generator V1 is committed here
  without any modifications or additions.  this location is tagged
  so that it can be identified later.
```

To apply V2 of the generator, the following `regeneration method` is used:  

1. Create a `working-branch` at HEAD of master. We'll use it in a moment.
```
o---V1---A-...--o---N  (master, working-branch)
```

2. Create `temp-branch` forking from right before 
the commit of V1. Run `generator V2` and commit its output into `temp-branch`.

```
o---V1---A-...--o---N  (master, working-branch)
 \
  V2  (temp-branch)
  ^
  |
 clean output of generator V2 committed here
```

3. Rebase the segment [A..N] of `working-branch` onto the `temp-branch`.
At this point we're likely to encounter merge conflicts, and they should be resolved manually
```
o---V1---A-...--o---N  (master)
 \                  
  V2  (temp-branch)
   \
    A`---o-...-o---N` (working-branch)
```
Note that at this point, N` contains all of the modifications made to V1, but as if they
were made on V2.


4. Switch back to `master`, erase the files created by generator V1, run generator V2 there
and commit the output 
```
o---V1---A-...--o---N---V2  (master)
 \                  
  V2  (temp-branch)
   \
    A`---o-...-o---N` (working-branch)
```
creating a clean V2 in master allows us to run this algorithm again in the future (to convert from V2 to V3)

5. Still in `master`: delete the output of V2 and commit the contents of N` 
```
o---V1---A-...--o---N---V2---N`  (master)
 \                  
  V2  (temp-branch)
   \
    A`---o-...-o---N` (working-branch)
```

6. It's now safe to delete `temp-branch` and `working-branch`
```
o---V1---A-...--o---N---V2---N`  (master)
```


## prerequisites

you need the following installed (preferably globally):
* git
* [hygen](http://www.hygen.io/)
* (optionally) [hygen-create](https://www.npmjs.com/package/hygen-create)

## limitations

this is an experimental tool, and it has quite a few limitations, many of which are
not yet know.

some of the known limitations:
* the tool currently assumes that the generator creates a 'project' (i.e., that everything created by the generator belongs in a specific folder hierarchy)
* the directory into which the code is generated has the same name as the value passed to the generator using the `--name` flag
* it's best to run the tool *outside* of the directory on which it operates. 
* you must `export HYGEN_TMPLS=<location of templates>` (hygen's `_templates` search mechanism is not currently supported)

## commands

Note: the commands can only be run in a git repository.

* `proj-maker new <unit-type> <unit-name> [-n <version>]` - creates a new unit called `<unit-name>`, commits it to the git repo and tags it to allow future updates.  the unit is  
created by running the command `hygen <unit-type> new --name <unit-name>`.  if `[-n <version>]` is specified, 
the executed command will be `hygen <unit-type> new.<version>` (so, for example, `proj-maker new greeter HiThere -n 2` will execute `hygen greeter new.2 --name HiThere` and then commit the result).

* `proj-maker update <unit-name> [-n <version>]` - applies the `regeneration method` described above.  If there are no merge conflicts, this will run the entire course of the
algorithm.  If a merge conflict is encountered, it will stop at `step 3`.  You will need
to resolve the conflicts, `git add` all modified files and run `git rebase --continue`.  
The names of the `temp-branch` and `working-branch` created by this command will have a `pm-`
prefix.

* `proj-maker continue` - run this to resume the process paused at `step 3` after 
you have resolved all of the conflicts and executed `git rebase --continue`.  This command
will refuse to run unless it's in a branch with a `pm-` prefix.


## notes

The tool is currently extremely verbose. The output of all git commands is displayed, and
branching information is displayed at strategic points.

The robustness and usefulness of the tool are yet to be determined.

## license

MIT license.  

And once again: please be *very* careful when using this tool.  Do not run it 
in situations where you might lose important data, and make sure you have everything
backed up.
