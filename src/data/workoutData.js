// Workout data mapped directly from Vivaswan's Elite Gym Plan PDF

export const WORKOUT_PLAN = [
    {
        day: 1,
        target: "Chest & Triceps",
        dayName: "Monday",
        emoji: "💪",
        color: "#E31E24",
        gradient: ["#E31E24", "#7A1013"],
        headerImage: require("../../assets/chest_header_premium.png"),
        focus: "Barbell Bench Press is the anchor. Build the entire session around it.",
        exercises: [
            {
                name: "Barbell Bench Press",
                sets: 5,
                type: "reps",
                repRange: "5·5·6·8·10",
                activeTimeSec: 45,
                restTimeSec: 180,
                primaryTarget: "Mid Chest",
                image: null,
                tips: [
                    "Pyramid down in weight as reps go up.",
                    "Feet flat, arch back slightly, pinch shoulder blades.",
                    "Bar touches mid-chest controlled, press up explosively."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "MAIN COMPOUND"
            },
            {
                name: "Incline Dumbbell Press",
                sets: 4,
                type: "reps",
                repRange: "8-12",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Upper Chest",
                image: null,
                tips: [
                    "Set bench angle to 30–45 degrees.",
                    "Get a full stretch at the bottom.",
                    "Maintain a controlled tempo throughout."
                ],
                equipment: "Dumbbells",
                unilateral: false,
                tag: "UPPER CHEST"
            },
            {
                name: "Cable Fly — Low to High",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Inner + Upper Chest",
                image: null,
                tips: [
                    "Set cables at the lowest pulley, pull upward and across.",
                    "Maintain constant tension throughout.",
                    "Feel the deep squeeze at the top of the movement."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "INNER + UPPER"
            },
            {
                name: "Machine Chest Press",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Chest Pump",
                image: null,
                tips: [
                    "Great finishing movement.",
                    "Lets you push to failure safely.",
                    "Focus on squeezing the chest at full extension."
                ],
                equipment: "Machine",
                unilateral: false,
                tag: "PUMP + ISOLATION"
            },
            {
                name: "Cable Tricep Pushdown — Rope",
                sets: 4,
                type: "reps",
                repRange: "10-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Triceps (Lateral Head)",
                image: null,
                tips: [
                    "Keep your elbows glued to your sides.",
                    "Flare the rope outward at the bottom.",
                    "Triceps make up 2/3 of your arm size, prioritize them."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "LATERAL HEAD"
            },
            {
                name: "Overhead Cable Tricep Extension",
                sets: 3,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Triceps (Long Head)",
                image: null,
                tips: [
                    "Face away from the cable machine, arms overhead.",
                    "The long head only gets fully stretched overhead.",
                    "Control the stretch at the bottom before extending."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "LONG HEAD"
            }
        ]
    },
    {
        day: 2,
        target: "Back & Biceps",
        dayName: "Tuesday",
        emoji: "🏋️",
        color: "#5856D6",
        gradient: ["#5856D6", "#2B2A6B"],
        headerImage: require("../../assets/back_header_premium.png"),
        focus: "Barbell Row is king here. A thick back = the illusion of width even at your current weight.",
        exercises: [
            {
                name: "Barbell Bent-Over Row",
                sets: 5,
                type: "reps",
                repRange: "5·5·6·8·10",
                activeTimeSec: 45,
                restTimeSec: 180,
                primaryTarget: "Mid & Lower Back",
                image: null,
                tips: [
                    "Hinge at the hips to 45 degrees, chest up, row to lower rib cage.",
                    "Hits mid/lower traps, rhomboids, and lats simultaneously.",
                    "This is the upper body squat. Never skip it."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "MAIN COMPOUND"
            },
            {
                name: "Lat Pulldown — Wide Grip",
                sets: 4,
                type: "reps",
                repRange: "8-12",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Lats (Width)",
                image: null,
                tips: [
                    "Pull the bar to your upper chest.",
                    "Drive your elbows DOWN, not backward.",
                    "Full stretch at the top. This builds your V-taper."
                ],
                equipment: "Lat Pulldown Machine",
                unilateral: false,
                tag: "LAT WIDTH"
            },
            {
                name: "Seated Cable Row — Close Grip",
                sets: 4,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Mid Back (Thickness)",
                image: null,
                tips: [
                    "Pull to your belly button.",
                    "Squeeze your shoulder blades hard together at peak contraction.",
                    "Builds 3D back thickness."
                ],
                equipment: "Cable Row Machine",
                unilateral: false,
                tag: "MID BACK"
            },
            {
                name: "Single Arm Dumbbell Row",
                sets: 3,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lats",
                image: null,
                tips: [
                    "Drive your elbow to the ceiling, not backward.",
                    "Get a full stretch at the bottom.",
                    "Unilateral exercise: prevents stronger side compensation."
                ],
                equipment: "Dumbbell",
                unilateral: true,
                tag: "LATS"
            },
            {
                name: "Face Pulls — Cable",
                sets: 3,
                type: "reps",
                repRange: "15-20",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Rear Delts & Posture",
                image: null,
                tips: [
                    "Set cable at face height, pull to ears.",
                    "Externally rotate hands at the end of the pull.",
                    "Critical for shoulder health and posture. Non-negotiable."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "REAR DELT + HEALTH"
            },
            {
                name: "EZ Bar Bicep Curl",
                sets: 4,
                type: "reps",
                repRange: "8-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Biceps",
                image: null,
                tips: [
                    "EZ bar is much easier on wrists than straight bar.",
                    "Control the negative — biceps grow more on the way down.",
                    "Do not swing your torso."
                ],
                equipment: "EZ Bar",
                unilateral: false,
                tag: "BICEP PEAK"
            }
        ]
    },
    {
        day: 3,
        target: "Shoulders & Abs",
        dayName: "Wednesday",
        emoji: "⚡",
        color: "#FF9500",
        gradient: ["#FF9500", "#7A4700"],
        headerImage: require("../../assets/shoulders_header_premium.png"),
        focus: "Overhead Press first, always. Shoulder width is the fastest visual transformation for your frame.",
        exercises: [
            {
                name: "Barbell Overhead Press (OHP)",
                sets: 5,
                type: "reps",
                repRange: "5·5·6·8·10",
                activeTimeSec: 45,
                restTimeSec: 180,
                primaryTarget: "Shoulders (Full)",
                image: null,
                tips: [
                    "Standing is harder and better for core strength.",
                    "Bar starts at collarbone, press straight up.",
                    "Push your head slightly forward at the top (lockout)."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "MAIN COMPOUND"
            },
            {
                name: "Dumbbell Lateral Raise",
                sets: 4,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lateral Deltoids",
                image: null,
                tips: [
                    "Slight forward lean, lead with elbows, slight bend in arm.",
                    "THIS gives you shoulder width.",
                    "Do not cheat with momentum — it ruins the activation."
                ],
                equipment: "Dumbbells",
                unilateral: false,
                tag: "SHOULDER WIDTH"
            },
            {
                name: "Cable Lateral Raise",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lateral Deltoids (Tension)",
                image: null,
                tips: [
                    "Cable keeps constant tension at the bottom unlike dumbbells.",
                    "Use cross-body setup, raise away from stack.",
                    "One of the best isolation movements."
                ],
                equipment: "Cable Machine",
                unilateral: true,
                tag: "WIDTH + TENSION"
            },
            {
                name: "Rear Delt Fly — Machine or Cable",
                sets: 4,
                type: "reps",
                repRange: "15-20",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Rear Deltoids",
                image: null,
                tips: [
                    "Rear delts give shoulders a full 3D look from the side/back.",
                    "Severely undertrained by most. Reverse pec deck is ideal.",
                    "Keep hands high and elbows out."
                ],
                equipment: "Machine / Cables",
                unilateral: false,
                tag: "REAR DELT"
            },
            {
                name: "Hanging Leg Raise",
                sets: 4,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lower Abs",
                image: null,
                tips: [
                    "Hang from pull-up bar, raise legs to 90 degrees.",
                    "Perform strictly without swinging your body.",
                    "The best lower ab exercise in existence."
                ],
                equipment: "Pull-up Bar",
                unilateral: false,
                tag: "LOWER ABS"
            },
            {
                name: "Cable Crunch",
                sets: 3,
                type: "reps",
                repRange: "15-20",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Upper Abs",
                image: null,
                tips: [
                    "Use rope attachment, kneel down.",
                    "Crunch down pulling your elbows to your knees.",
                    "Abs need progressive resistance to grow, not just bodyweight."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "UPPER ABS"
            }
        ]
    },
    {
        day: 4,
        target: "Legs",
        dayName: "Thursday",
        emoji: "🦵",
        color: "#FF2D55",
        gradient: ["#FF2D55", "#7A1528"],
        headerImage: require("../../assets/legs_header_premium.png"),
        focus: "Barbell Squat is the most important exercise in this entire plan. Do not skip, do not half-rep.",
        exercises: [
            {
                name: "Barbell Back Squat",
                sets: 5,
                type: "reps",
                repRange: "5·5·6·8·10",
                activeTimeSec: 45,
                restTimeSec: 180,
                primaryTarget: "Quads & Glutes",
                image: null,
                tips: [
                    "Place bar on upper traps, chest up, knees track over toes.",
                    "Squat below parallel. Full depth or it doesn't count.",
                    "Squats raise testosterone and growth hormone system-wide."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "KING OF ALL LIFTS"
            },
            {
                name: "Romanian Deadlift",
                sets: 4,
                type: "reps",
                repRange: "8-10",
                activeTimeSec: 45,
                restTimeSec: 120,
                primaryTarget: "Hamstrings",
                image: null,
                tips: [
                    "Drag bar down your legs, hinging at the hips.",
                    "Feel the deep stretch in your hamstrings, drive hips through.",
                    "If you feel it in your lower back, your hinge form is wrong."
                ],
                equipment: "Barbell / Dumbbells",
                unilateral: false,
                tag: "HAMSTRINGS"
            },
            {
                name: "Leg Press",
                sets: 3,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Quad Volume",
                image: null,
                tips: [
                    "Feet shoulder width apart, do not let knees cave inward.",
                    "Go deep (at least 90 degrees).",
                    "Add a drop set on your last working set."
                ],
                equipment: "Leg Press Machine",
                unilateral: false,
                tag: "QUAD VOLUME"
            },
            {
                name: "Leg Curl — Lying Machine",
                sets: 3,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Hamstrings (Isolation)",
                image: null,
                tips: [
                    "Keep hips pressed firmly into pad throughout.",
                    "Curl up explosively, lower slowly (3 seconds negative).",
                    "The negative is where hamstrings grow most."
                ],
                equipment: "Lying Leg Curl Machine",
                unilateral: false,
                tag: "HAMSTRINGS"
            },
            {
                name: "Leg Extension",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Quad Isolation",
                image: null,
                tips: [
                    "Full knee extension, squeeze at the top for 1 second.",
                    "Great for quad definition and teardrop muscle.",
                    "Do not use this as your only quad work."
                ],
                equipment: "Leg Extension Machine",
                unilateral: false,
                tag: "QUAD ISOLATION"
            },
            {
                name: "Standing Calf Raise",
                sets: 4,
                type: "reps",
                repRange: "15-25",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Calves",
                image: null,
                tips: [
                    "Full range of motion: stretch all the way down, rise to toes.",
                    "Calves have slow-twitch fibres — they need high volume and range.",
                    "Hold the contraction at the peak for a split second."
                ],
                equipment: "Calf Raise Machine",
                unilateral: false,
                tag: "CALVES"
            }
        ]
    },
    {
        day: 5,
        target: "Chest & Back (Heavy)",
        dayName: "Friday",
        emoji: "🔥",
        color: "#E31E24",
        gradient: ["#E31E24", "#5856D6"],
        headerImage: require("../../assets/back_header_premium.png"),
        focus: "Heavy compound day. Different angles from Monday. No machines today — just barbells and cables.",
        exercises: [
            {
                name: "Incline Barbell Press",
                sets: 4,
                type: "reps",
                repRange: "6-10",
                activeTimeSec: 45,
                restTimeSec: 180,
                primaryTarget: "Upper Chest",
                image: null,
                tips: [
                    "Upper chest is the weakest area for beginners and highly visible.",
                    "30 degree incline, same arch/shoulder blade rules as bench.",
                    "Controlled descent to upper collarbone region."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "UPPER CHEST"
            },
            {
                name: "Weighted Pull-ups",
                sets: 4,
                type: "reps",
                repRange: "6-10",
                activeTimeSec: 45,
                restTimeSec: 120,
                primaryTarget: "Lats (Width)",
                image: null,
                tips: [
                    "Add weight via belt or hold dumbbell between feet if bodyweight is easy.",
                    "The barbell squat of upper body pulling.",
                    "Drive elbows down to engage lats. Full hang at bottom."
                ],
                equipment: "Pull-up Bar + Weight",
                unilateral: false,
                tag: "LAT WIDTH"
            },
            {
                name: "Chest Dip — Weighted",
                sets: 4,
                type: "reps",
                repRange: "8-12",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Lower Chest",
                image: null,
                tips: [
                    "Lean forward to hit the chest. Staying upright hits triceps.",
                    "Add weight once bodyweight is easy.",
                    "Hits lower chest in a way flat bench cannot."
                ],
                equipment: "Dip Bars + Weight",
                unilateral: false,
                tag: "LOWER CHEST"
            },
            {
                name: "T-Bar Row or Chest-Supported Row",
                sets: 4,
                type: "reps",
                repRange: "8-10",
                activeTimeSec: 45,
                restTimeSec: 120,
                primaryTarget: "Back Thickness",
                image: null,
                tips: [
                    "Chest-supported setup removes the lower back from the equation.",
                    "Pure back work. Drive elbows back.",
                    "Squeeze shoulder blades hard at the top of every rep."
                ],
                equipment: "T-Bar Row Machine / Barbell",
                unilateral: false,
                tag: "BACK THICKNESS"
            },
            {
                name: "Cable Fly — High to Low",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lower & Inner Chest",
                image: null,
                tips: [
                    "Set cables at the top, pull downward and across.",
                    "Excellent finisher for the chest.",
                    "Hits lower chest without putting excessive load on joints."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "LOWER CHEST"
            }
        ]
    },
    {
        day: 6,
        target: "Arms & Abs",
        dayName: "Saturday",
        emoji: "💪",
        color: "#007AFF",
        gradient: ["#007AFF", "#003D7A"],
        headerImage: require("../../assets/abs_header_premium.jpg"),
        focus: "Pure arm day. Biceps and triceps are fresh, nothing pre-fatigued. Go heavy and feel every rep.",
        exercises: [
            {
                name: "Barbell Curl",
                sets: 4,
                type: "reps",
                repRange: "8-10",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Bicep Mass",
                image: null,
                tips: [
                    "The absolute best mass builder for biceps.",
                    "Elbows stay slightly forward at the top to keep tension.",
                    "Control the negative (2–3 seconds down)."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "BICEP MASS"
            },
            {
                name: "Incline Dumbbell Curl",
                sets: 3,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Bicep Peak (Long Head)",
                image: null,
                tips: [
                    "Set incline bench at 45–60 degrees, let arms hang straight down.",
                    "This fully stretches the long head of the bicep for peak height.",
                    "Slow, controlled reps. Keep elbows back."
                ],
                equipment: "Dumbbells + Incline Bench",
                unilateral: false,
                tag: "LONG HEAD STRETCH"
            },
            {
                name: "Hammer Curl",
                sets: 3,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Brachialis & Forearms",
                image: null,
                tips: [
                    "Use a neutral grip (palms facing each other).",
                    "Hits the brachialis, pushing the bicep UP for visual thickness.",
                    "Also hits forearm brachioradialis."
                ],
                equipment: "Dumbbells",
                unilateral: false,
                tag: "BRACHIALIS"
            },
            {
                name: "Close Grip Bench Press",
                sets: 4,
                type: "reps",
                repRange: "8-10",
                activeTimeSec: 45,
                restTimeSec: 90,
                primaryTarget: "Tricep Mass",
                image: null,
                tips: [
                    "Hands shoulder-width apart, elbows tucked to ribs.",
                    "The best compound mass builder for triceps.",
                    "Allows heavier loading than isolation movements."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "TRICEP MASS"
            },
            {
                name: "Cable Pushdown — Bar",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Triceps (Lateral Head)",
                image: null,
                tips: [
                    "Straight bar provides more lateral head activation.",
                    "Elbows pinned to sides. Full extension at bottom.",
                    "Control the release."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "LATERAL HEAD"
            },
            {
                name: "Ab Wheel Rollout",
                sets: 3,
                type: "reps",
                repRange: "8-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Core Stability",
                image: null,
                tips: [
                    "Hardest core exercise. Roll out until back is almost flat.",
                    "Pull back in using ABS only, do not pull with hips.",
                    "Builds core stability and visible abs simultaneously."
                ],
                equipment: "Ab Wheel",
                unilateral: false,
                tag: "FULL CORE"
            },
            {
                name: "Weighted Plank",
                sets: 3,
                type: "timer",
                repRange: "45-60 sec",
                activeTimeSec: 60,
                restTimeSec: 60,
                primaryTarget: "Core Strength",
                image: null,
                tips: [
                    "Place a plate on your back.",
                    "Squeeze glutes and abs simultaneously.",
                    "Core is a muscle — it needs progressive resistance to grow."
                ],
                equipment: "Weight Plate + Plank",
                unilateral: false,
                tag: "CORE STABILITY"
            }
        ]
    }
];

export const REST_DAY = {
    day: 7,
    target: "Rest",
    dayName: "Sunday",
    emoji: "😴",
    color: "#636366",
    gradient: ["#2C2C2E", "#1C1C1E"]
};

export const PLAN_TIPS = [
    "Beat at least one number from last week (Progressive Overload)",
    "Log every set: Exercise · Weight · Reps. Notes are rules.",
    "Mandatory warm-up: 5m cardio + 2 warm-up sets for compounds",
    "Rest times: Compounds 2–3 min. Isolation 60–90 sec.",
    "Feel the target muscle working. Focus mind-muscle connection.",
    "Never skip legs. Squats raise anabolic hormones system-wide."
];

// ────────────────────────────────────────────────────────────────
// PDF INTEL — THE FULL MANUAL DETAILS FOR THE PREMIUM HANDBOOK
// ────────────────────────────────────────────────────────────────

export const PLAN_SCIENCE = [
    {
        principle: "Chest + Back hit 2x/week",
        meaning: "Muscle protein synthesis peaks at 48 hours. Hitting each muscle twice weekly maximises growth stimulus."
    },
    {
        principle: "Arms trained fresh on Wed",
        meaning: "Biceps and triceps get direct work when fully recovered, not pre-fatigued from heavy compound movements."
    },
    {
        principle: "Legs get their own day",
        meaning: "Legs make up 40% of total muscle mass. Heavy squats trigger systemic anabolic hormone release."
    },
    {
        principle: "Fri is heavy compound day",
        meaning: "Second chest + back session using different angles and no machines, keeping adaptation from plateauing."
    },
    {
        principle: "Sat is pure arms + abs",
        meaning: "Arms get a second dedicated session. At 19, arms respond fast to targeted frequency."
    }
];

export const PLAN_RULES = [
    {
        rule: "PROGRESSIVE OVERLOAD",
        desc: "Every single session, beat at least ONE number from last week. One more rep. 2.5 kg more weight. Anything. This is the entire game of muscle growth."
    },
    {
        rule: "LOG EVERYTHING",
        desc: "Open Notes/Log after every single set. Record weight and reps. If you don't track it, it didn't happen."
    },
    {
        rule: "WARM-UP IS MANDATORY",
        desc: "5 mins cardio + 2 warm-up sets of every main compound lift before working sets. Joint safety first, ego second."
    },
    {
        rule: "REST TIMES ARE RULES",
        desc: "Compounds: 2-3 mins rest. Isolation: 60-90 secs rest. Cutting rest short limits your strength and cuts gains short."
    },
    {
        rule: "MIND-MUSCLE CONNECTION",
        desc: "Feel the target muscle contract. If you cannot feel your chest contracting on bench press, the weight is too heavy or form is wrong."
    },
    {
        rule: "NEVER SKIP LEGS",
        desc: "Leg training raises testosterone and growth hormone system-wide. Squatting makes your entire body grow, not just your thighs."
    }
];

export const PROGRESSION_SYSTEM = [
    {
        week: "W 1–2",
        setsReps: "5 × 10",
        isoReps: "12–15 reps",
        focus: "Technique first. Film your lifts. Zero ego. Establish your baselines."
    },
    {
        week: "W 3–4",
        setsReps: "5 × 8",
        isoReps: "12–15 reps",
        focus: "Add weight. First real progressive overload push begins."
    },
    {
        week: "W 5–6",
        setsReps: "5 × 6",
        isoReps: "10–12 reps",
        focus: "Go heavier. Strength phase begins. Weights and numbers jump here."
    },
    {
        week: "W 7–8",
        setsReps: "5 × 5",
        isoReps: "10–12 reps",
        focus: "Peak strength phase. Max heavy lifting. Best muscle gains of the 12 weeks."
    },
    {
        week: "W 9–10",
        setsReps: "4 × 8",
        isoReps: "12–15 reps",
        focus: "Hypertrophy focus. Increase sets/volume slightly with moderate weight."
    },
    {
        week: "W 11–12",
        setsReps: "4 × 10",
        isoReps: "12–15 reps",
        focus: "Attempt PRs! Test your 1-rep maximums on all compound lifts."
    }
];

export const RESULTS_TIMELINE = [
    {
        time: "Month 1",
        result: "Strength jumps dramatically due to nervous system adaptation. Mirror look stays same."
    },
    {
        time: "Month 2",
        result: "People notice. Chest and shoulders show first at low body fat."
    },
    {
        time: "Month 3",
        result: "Arms are measurably larger. Back gets that 3D wide V-taper. Scale up 2-3 kg minimum."
    },
    {
        time: "Month 6",
        result: "Unrecognisable from start photos. 5-6 kg of actual muscle mass added."
    },
    {
        time: "Month 12",
        result: "8-12 kg of muscle added. On a 172cm frame, this is an extreme visual transformation."
    }
];

export const PLAN_SECRET = {
    title: "THE ONLY SECRET",
    content: "Show up. Log the numbers. Beat them next week. Eat enough. Sleep 8 hours. That's it. Everyone who looks jacked just did exactly that for long enough. You have the frame, the body fat, and now the plan. The rest is just execution."
};

// Tactical Starting Weights based directly on Vivaswan's Elite Gym Plan PDF
export const SUGGESTED_WEIGHTS = {
    "barbell bench press": "30–50 kg",
    "barbell back squat": "40–60 kg",
    "barbell overhead press (ohp)": "20–35 kg",
    "barbell bent-over row": "30–50 kg",
    "romanian deadlift": "40–60 kg",
    "incline dumbbell press": "10–16 kg ea",
    "dumbbell lateral raise": "4–8 kg ea",
    "ez bar bicep curl": "15–25 kg",
    "ez bar reverse curl": "10–20 kg",
    "cable tricep pushdown — rope": "15–25 kg",
    "lat pulldown — wide grip": "35–50 kg",
    "seated cable row — close grip": "30–45 kg",
    "wrist curl": "10–15 kg",
    "reverse wrist curl": "5–10 kg",
    "farmer's walk": "16–24 kg ea",
    "cable fly — low to high": "10–20 kg",
    "machine chest press": "20–40 kg",
    "overhead cable tricep extension": "10–20 kg",
    "single arm dumbbell row": "12–20 kg ea",
    "face pulls — cable": "10–20 kg",
    "cable lateral raise": "4–8 kg ea",
    "rear delt fly — machine or cable": "10–20 kg",
    "hanging leg raise": "Bodyweight",
    "cable crunch": "15–25 kg",
    "leg press": "40–80 kg",
    "leg curl — lying machine": "15–30 kg",
    "leg extension": "15–30 kg",
    "standing calf raise": "20–40 kg",
    "incline barbell press": "25–45 kg",
    "weighted pull-ups": "Bodyweight",
    "chest dip — weighted": "Bodyweight",
    "t-bar row or chest-supported row": "20–35 kg",
    "cable fly — high to low": "10–20 kg",
    "barbell curl": "15–25 kg",
    "incline dumbbell curl": "8–12 kg ea",
    "hammer curl": "10–14 kg ea",
    "close grip bench press": "25–45 kg",
    "cable pushdown — bar": "15–25 kg",
    "ab wheel rollout": "Bodyweight",
    "weighted plank": "Bodyweight",
    "dead hang": "Bodyweight",
    "barbell wrist curl": "10–15 kg",
    "rear delt fly — pec deck reverse": "10–20 kg",
    "cable crossover — high to low": "10–20 kg",
    "cable pushdown — straight bar": "15–25 kg"
};

export const getSuggestedWeight = (exerciseName) => {
    if (!exerciseName) return "";
    return SUGGESTED_WEIGHTS[exerciseName.toLowerCase().trim()] || "";
};

