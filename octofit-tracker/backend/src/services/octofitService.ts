import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const validId = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

  if (
    !validId(userId) ||
    !validId(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isInteger(minutes) ||
    minutes < 1
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id'),
    Team.findById(teamId).select('_id'),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof mascot !== 'string' ||
    !mascot.trim() ||
    !Array.isArray(members) ||
    members.some((member) => typeof member !== 'string' || !/^[a-f\d]{24}$/i.test(member))
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const memberUsers = members.length
    ? await User.find({ _id: { $in: members } }).select('_id team')
    : [];
  if (memberUsers.length !== members.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberUsers.map((member) => member._id),
  });

  if (members.length) {
    await Team.updateMany(
      { _id: { $ne: team._id } },
      { $pull: { members: { $in: memberUsers.map((member) => member._id) } } },
    );
    await User.updateMany(
      { _id: { $in: memberUsers.map((member) => member._id) } },
      { $set: { team: team._id } },
    );
  }

  return team;
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $set: {
        totalPoints: {
          $sum: {
            $map: {
              input: '$activities',
              as: 'activity',
              in: '$$activity.points',
            },
          },
        },
      },
    },
    { $sort: { totalPoints: -1, name: 1 } },
    { $project: { _id: 0, teamName: '$name', totalPoints: 1 } },
  ]);

  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).select('_id fitnessGoal');
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).select('type').lean(),
    Workout.find().lean(),
  ]);
  const latestActivityType = recentActivities[0]?.type.trim().toLowerCase();
  const activityFocusByType: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'mobility',
    strength: 'strength',
  };
  const activityFocus = latestActivityType
    ? activityFocusByType[latestActivityType] ?? latestActivityType
    : undefined;
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const workoutFocus = (focus: string) => focus.trim().toLowerCase();
  const preferredFocus = workouts.some((workout) => workoutFocus(workout.focus) === goalFocus)
    ? goalFocus
    : activityFocus;

  return workouts
    .slice()
    .sort((left, right) => {
      const leftMatches = workoutFocus(left.focus) === preferredFocus;
      const rightMatches = workoutFocus(right.focus) === preferredFocus;
      return Number(rightMatches) - Number(leftMatches);
    })
    .map((workout) => {
      const focus = workoutFocus(workout.focus);
      const reason = focus === goalFocus
        ? `Recommended for your ${user.fitnessGoal} goal${latestActivityType ? ` and recent ${latestActivityType} activity` : ''}.`
        : focus === activityFocus && latestActivityType
          ? `Recommended based on your recent ${latestActivityType} activity.`
          : `Suggested to complement your ${user.fitnessGoal} goal.`;
      return { ...workout, reason };
    });
}

export { User };
