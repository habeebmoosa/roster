# Agile basics

Reference definitions for the core agile/scrum concepts used day to day.

## Sprints and iterations

A sprint (or iteration) is a fixed time box — commonly one or two weeks — during which a team
commits to completing a defined set of work. The length shouldn't change sprint to sprint; a
consistent cadence is what makes velocity comparisons meaningful over time.

## Backlog vs. sprint backlog

The **backlog** is the full, ranked list of everything the team might work on, groomed and
reprioritized continuously. The **sprint backlog** is the subset pulled into the current sprint —
once committed, it shouldn't grow mid-sprint without a corresponding trade-off (something else
comes out, or the team explicitly accepts scope growth).

## Story points vs. time estimates

Story points estimate relative effort/complexity (a 5-point story is roughly as hard as another
5-point story), not calendar time directly — this avoids the trap of estimates becoming false
promises when unexpected complexity shows up. Time estimates (hours/days) are more intuitive but
tend to be treated as commitments rather than estimates, which causes friction when they're wrong.

## The daily standup

Each person answers three questions: what did I do since the last standup, what will I do before
the next one, and what's blocking me. It is a status sync, not a working session — anything that
needs real discussion gets parked for a smaller follow-up, not solved in the standup itself.

## Definition of done

A task isn't "done" just because the code was written. The definition of done should be agreed
upfront and typically includes: code reviewed, tests passing, deployed (or ready to deploy), and
any related documentation updated. A vague or missing definition of done is why "done" tasks keep
reopening.
