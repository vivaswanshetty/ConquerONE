// Workout data mapped directly from Vivaswan's Elite Gym Plan PDF

export const WORKOUT_PLAN = [
    {
        day: 1,
        target: "Chest + Triceps",
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
                    "Feet flat, arch back slightly, pinch shoulder blades.",
                    "Bar touches mid-chest controlled, press up explosively.",
                    "Start with the bar and work up. Your #1 chest builder for life."
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
                    "Bench at 30–45°. Full stretch at bottom.",
                    "Upper chest is the most visible from the front.",
                    "Maintain a controlled tempo throughout."
                ],
                equipment: "Dumbbells",
                unilateral: false,
                tag: "UPPER CHEST"
            },
            {
                name: "Cable Crossover — High to Low",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lower + Inner Chest",
                image: null,
                tips: [
                    "Cables at top, step forward, pull down and across.",
                    "Constant tension. Better than machine chest press.",
                    "Squeeze hard at peak contraction."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "LOWER + INNER CHEST"
            },
            {
                name: "Cable Fly — Low to High",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Upper + Inner Chest",
                image: null,
                tips: [
                    "Cables at bottom, pull upward and across.",
                    "Great pump finisher for inner and upper chest.",
                    "Maintain constant tension throughout the arc."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "UPPER + INNER CHEST"
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
                    "Elbows glued to sides. Flare rope outward at bottom.",
                    "Triceps = 2/3 of arm size — they matter more than biceps.",
                    "Control the return to 90 degrees."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "TRICEP LATERAL HEAD"
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
                    "Face away from cable, arms overhead.",
                    "Long head only fully stretches overhead — it's the biggest tricep head.",
                    "Control the stretch at the bottom before extending."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "TRICEP LONG HEAD"
            }
        ]
    },
    {
        day: 2,
        target: "Back + Biceps + Forearms",
        dayName: "Tuesday",
        emoji: "🏋️",
        color: "#5856D6",
        gradient: ["#5856D6", "#2B2A6B"],
        headerImage: require("../../assets/back_header_premium.png"),
        focus: "Barbell Row is king. Every pulling rep also trains your forearms indirectly — grip hard on every set.",
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
                    "Hinge to 45°, chest up, row to lower ribs.",
                    "Hits mid traps, rhomboids, lats simultaneously.",
                    "Every pulling rep trains your forearms indirectly — grip hard."
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
                    "Pull to upper chest, elbows drive DOWN not back.",
                    "V-taper comes from lats. Full stretch at top.",
                    "Hold contraction for 2 extra seconds on last set for forearms."
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
                primaryTarget: "Mid Back Thickness",
                image: null,
                tips: [
                    "Pull to belly button, squeeze blades hard together.",
                    "Builds 3D mid-back thickness.",
                    "Hold 2 sec at the end of every rep."
                ],
                equipment: "Cable Row Machine",
                unilateral: false,
                tag: "MID BACK THICKNESS"
            },
            {
                name: "Single Arm Dumbbell Row",
                sets: 3,
                type: "reps",
                repRange: "10-12 each",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lats",
                image: null,
                tips: [
                    "Drive elbow to ceiling. Full stretch at bottom.",
                    "Unilateral — can't compensate with stronger side.",
                    "Keep torso stable without rotating."
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
                    "Cable at face height, pull to ears, externally rotate.",
                    "Best exercise for posture + long-term shoulder health.",
                    "Squeeze rear delts hard at peak contraction."
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
                primaryTarget: "Bicep Peak",
                image: null,
                tips: [
                    "Control the negative (lower in 3 sec) — biceps grow more on the way down.",
                    "EZ bar is much easier on wrists than straight bar.",
                    "Do not swing your torso."
                ],
                equipment: "EZ Bar",
                unilateral: false,
                tag: "BICEP PEAK"
            },
            {
                name: "EZ Bar Reverse Curl",
                sets: 4,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Brachioradialis & Forearms",
                image: null,
                tips: [
                    "FOREARM FINISHER. Overhand grip on EZ bar, curl up.",
                    "The #1 exercise for forearm thickness.",
                    "Will feel hard vs regular curl — that's normal. It IS harder."
                ],
                equipment: "EZ Bar",
                unilateral: false,
                tag: "FOREARM — BRACHIORADIALIS"
            },
            {
                name: "Dead Hang",
                sets: 3,
                type: "timer",
                repRange: "30–45 sec",
                activeTimeSec: 45,
                restTimeSec: 45,
                primaryTarget: "Grip Strength & Forearm Flexors",
                image: null,
                tips: [
                    "FOREARM FINISHER. Hang from pull-up bar, fully relax hands.",
                    "Builds grip strength + stretches forearm flexors hard.",
                    "Decompresses spine and increases crushing grip endurance."
                ],
                equipment: "Pull-up Bar",
                unilateral: false,
                tag: "FOREARM — GRIP + STRETCH"
            }
        ]
    },
    {
        day: 3,
        target: "Shoulders + Abs",
        dayName: "Wednesday",
        emoji: "⚡",
        color: "#FF9500",
        gradient: ["#FF9500", "#7A4700"],
        headerImage: require("../../assets/shoulders_header_premium.png"),
        focus: "Overhead Press first, always. Shoulder width is the fastest visual transformation at your frame.",
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
                    "Standing is harder and better. Bar starts at collarbone, press straight up.",
                    "The king of shoulder exercises.",
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
                primaryTarget: "Shoulder Width",
                image: null,
                tips: [
                    "Slight forward lean, lead with elbows.",
                    "THIS is what gives you width.",
                    "No momentum — ruins the entire movement."
                ],
                equipment: "Dumbbells",
                unilateral: false,
                tag: "SHOULDER WIDTH"
            },
            {
                name: "Cable Lateral Raise",
                sets: 3,
                type: "reps",
                repRange: "12-15 each",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Lateral Deltoids (Constant Tension)",
                image: null,
                tips: [
                    "Cross-body cable, raise away.",
                    "Keeps tension at the bottom unlike dumbbells.",
                    "Control the eccentric descent."
                ],
                equipment: "Cable Machine",
                unilateral: true,
                tag: "WIDTH + CONSTANT TENSION"
            },
            {
                name: "Rear Delt Fly — Pec Deck Reverse",
                sets: 4,
                type: "reps",
                repRange: "15-20",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Rear Delts",
                image: null,
                tips: [
                    "Sit facing pec deck backwards.",
                    "Rear delts make shoulders look full from side and back. Most neglected muscle.",
                    "Lead with elbows, squeeze upper back."
                ],
                equipment: "Pec Deck Machine",
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
                    "Hang from pull-up bar, raise legs to 90° without swinging.",
                    "Single best lower ab exercise.",
                    "Curl pelvis upward at top for maximum contraction."
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
                    "Rope attachment, kneel, crunch elbows to knees.",
                    "Abs need resistance to grow — bodyweight crunches alone won't do it.",
                    "Exhale fully and hollow out core on contraction."
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
        focus: "Barbell Squat is the most important exercise in this entire plan. Full depth or it doesn't count.",
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
                    "Bar on upper traps, chest up, knees track toes, BELOW PARALLEL.",
                    "Full depth raises testosterone system-wide.",
                    "Never skip legs. Squats trigger systemic growth."
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
                    "Bar drags down your legs, hinge at hips, feel the hamstring stretch, drive hips through at the top.",
                    "Keep a flat back throughout.",
                    "Push hips back as far as possible."
                ],
                equipment: "Barbell",
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
                    "Feet shoulder width, don't let knees cave, go to at least 90°.",
                    "Drop set on last set.",
                    "Drive through mid-foot and heels."
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
                primaryTarget: "Hamstrings",
                image: null,
                tips: [
                    "Curl explosively, lower slowly in 3 sec.",
                    "The slow negative is where hamstrings actually grow.",
                    "Keep hips anchored to pad."
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
                    "Full extension, squeeze at top for 1 second.",
                    "Builds quad definition and teardrop shape.",
                    "Control the downward phase."
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
                    "Full range — stretch all the way down, full tiptoe at top.",
                    "Calves need high volume + full range to grow.",
                    "Hold peak contraction for 1 full second."
                ],
                equipment: "Calf Raise Machine",
                unilateral: false,
                tag: "CALVES"
            }
        ]
    },
    {
        day: 5,
        target: "Chest + Back (Heavy)",
        dayName: "Friday",
        emoji: "🔥",
        color: "#E31E24",
        gradient: ["#E31E24", "#5856D6"],
        headerImage: require("../../assets/back_header_premium.png"),
        focus: "Heavy compound day. Different angles from Monday. Barbells and cables only — no machines.",
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
                    "Upper chest = most visible + weakest in beginners. 30° incline.",
                    "Same cues as flat bench.",
                    "Lower controlled to upper chest collarbone level."
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
                primaryTarget: "Lat Width",
                image: null,
                tips: [
                    "Add weight via belt or DB between feet when bodyweight is easy.",
                    "The barbell squat of upper body pulling.",
                    "Full hang stretch at bottom, chin over bar."
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
                    "Lean forward to target chest, not upright.",
                    "Add weight when bodyweight is easy.",
                    "Lower to 90 degrees elbow bend."
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
                    "Chest supported removes lower back. Pure back work.",
                    "Drive elbows back, squeeze hard at top.",
                    "Control the stretch forward."
                ],
                equipment: "T-Bar Row / Barbell",
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
                primaryTarget: "Lower Chest Finisher",
                image: null,
                tips: [
                    "Cables at top, pull down and across.",
                    "Ends chest day without further loading the joints.",
                    "Squeeze lower pecs at bottom cross."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "LOWER CHEST FINISHER"
            }
        ]
    },
    {
        day: 6,
        target: "Arms + Forearms + Abs",
        dayName: "Saturday",
        emoji: "💪",
        color: "#007AFF",
        gradient: ["#007AFF", "#003D7A"],
        headerImage: require("../../assets/abs_header_premium.jpg"),
        focus: "Arms and forearms completely fresh today. The only day in the week with full dedicated forearm volume.",
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
                    "Best mass builder for biceps. Elbows slightly forward at top.",
                    "Control the negative 2–3 sec.",
                    "No swinging torso."
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
                primaryTarget: "Bicep Long Head (Peak)",
                image: null,
                tips: [
                    "Bench at 45–60°, arms hang straight.",
                    "Fully stretches long head — gives you the bicep peak.",
                    "Keep elbows pointing straight down."
                ],
                equipment: "Dumbbells + Incline Bench",
                unilateral: false,
                tag: "BICEP LONG HEAD"
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
                    "Neutral grip. Hits brachialis which pushes the bicep UP.",
                    "Also hits brachioradialis for forearm thickness.",
                    "Strict form with no shoulder sway."
                ],
                equipment: "Dumbbells",
                unilateral: false,
                tag: "BRACHIALIS + FOREARM"
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
                    "Hands shoulder-width, elbows tucked.",
                    "Best mass builder for triceps bar none.",
                    "Lower bar to lower sternum."
                ],
                equipment: "Barbell",
                unilateral: false,
                tag: "TRICEP MASS"
            },
            {
                name: "Cable Pushdown — Straight Bar",
                sets: 3,
                type: "reps",
                repRange: "12-15",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Triceps (Lateral Head)",
                image: null,
                tips: [
                    "Elbows pinned. Full extension at bottom.",
                    "Straight bar = more supination = more lateral head.",
                    "Lock out hard at bottom."
                ],
                equipment: "Cable Machine",
                unilateral: false,
                tag: "TRICEP LATERAL HEAD"
            },
            {
                name: "EZ Bar Reverse Curl",
                sets: 4,
                type: "reps",
                repRange: "10-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Forearms (Brachioradialis)",
                image: null,
                tips: [
                    "FOREARM. Overhand grip, curl up.",
                    "The single best exercise for forearm thickness and visual size.",
                    "Do not swing — keep elbows tight."
                ],
                equipment: "EZ Bar",
                unilateral: false,
                tag: "FOREARM — BRACHIORADIALIS"
            },
            {
                name: "Barbell Wrist Curl",
                sets: 3,
                type: "reps",
                repRange: "15-20",
                activeTimeSec: 45,
                restTimeSec: 45,
                primaryTarget: "Forearms (Flexors)",
                image: null,
                tips: [
                    "FOREARM. Sit on bench, forearms on thighs, let bar roll to fingertips, curl up.",
                    "Inner forearm bulk.",
                    "Use full range of motion."
                ],
                equipment: "Barbell / Dumbbell",
                unilateral: false,
                tag: "FOREARM — FLEXORS"
            },
            {
                name: "Reverse Wrist Curl",
                sets: 3,
                type: "reps",
                repRange: "15-20",
                activeTimeSec: 45,
                restTimeSec: 45,
                primaryTarget: "Forearms (Extensors)",
                image: null,
                tips: [
                    "FOREARM. Same position, overhand grip, extend wrist up.",
                    "Outer forearm definition.",
                    "Go much lighter than wrist curl."
                ],
                equipment: "Barbell / Dumbbell",
                unilateral: false,
                tag: "FOREARM — EXTENSORS"
            },
            {
                name: "Farmer's Walk",
                sets: 3,
                type: "timer",
                repRange: "30 sec walk",
                activeTimeSec: 30,
                restTimeSec: 60,
                primaryTarget: "Forearms (Overall Thickness)",
                image: null,
                tips: [
                    "FOREARM. Heaviest DBs you can hold for 30 sec, walk laps.",
                    "The best overall forearm size + grip builder in existence.",
                    "Grip should fail around 25–30 sec. That's the right weight."
                ],
                equipment: "Heavy Dumbbells",
                unilateral: false,
                tag: "FOREARM — OVERALL THICKNESS"
            },
            {
                name: "Ab Wheel Rollout",
                sets: 3,
                type: "reps",
                repRange: "8-12",
                activeTimeSec: 45,
                restTimeSec: 60,
                primaryTarget: "Full Core",
                image: null,
                tips: [
                    "Hardest core exercise in the gym.",
                    "Roll out until back flat, pull back using abs only.",
                    "Do not pull from the hips."
                ],
                equipment: "Ab Wheel",
                unilateral: false,
                tag: "FULL CORE"
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
        principle: "Chest+Back hit 2x/week",
        meaning: "Protein synthesis peaks at 48h — hitting each muscle twice weekly maximises growth."
    },
    {
        principle: "Arms + Forearms on Sat",
        meaning: "Both muscles fresh, not pre-fatigued. Dedicated forearm training added."
    },
    {
        principle: "Legs get their own day",
        meaning: "Legs = 40% total muscle mass. Squats raise testosterone system-wide."
    },
    {
        principle: "Fri is heavy compound day",
        meaning: "Different angles from Mon — stops adaptation from plateauing."
    },
    {
        principle: "Forearms trained 3x/week",
        meaning: "Indirectly on back day + directly on arms day + dedicated finishers. Maximum stimulus."
    }
];

export const PLAN_RULES = [
    {
        rule: "PROGRESSIVE OVERLOAD",
        desc: "Every session beat at least ONE number from last week. One more rep, 2.5kg more. This is the entire game."
    },
    {
        rule: "LOG EVERYTHING",
        desc: "Notes app after every set — Exercise · Weight · Reps. No log = no progress."
    },
    {
        rule: "WARM-UP IS MANDATORY",
        desc: "5 min cardio + 2 warm-up sets of every compound. Joints first, ego second."
    },
    {
        rule: "REST TIMES ARE RULES",
        desc: "Compounds: 2–3 min. Isolation: 60–90 sec. Cutting rest = cutting gains."
    },
    {
        rule: "NEVER SKIP LEGS",
        desc: "Every guy skips legs. Don't be that guy. Squats raise testosterone system-wide."
    },
    {
        rule: "FOREARM FINISHERS ARE NON-OPTIONAL",
        desc: "Added at the end of Tue and Sat. Do not skip them — forearms need frequency."
    }
];

export const PROGRESSION_SYSTEM = [
    {
        week: "W 1–2",
        setsReps: "5 × 10",
        isoReps: "12–15 reps",
        focus: "Technique first. Film every compound. Zero ego. Establish your baselines."
    },
    {
        week: "W 3–4",
        setsReps: "5 × 8",
        isoReps: "12–15 reps",
        focus: "Add weight. First real progressive overload weeks."
    },
    {
        week: "W 5–6",
        setsReps: "5 × 6",
        isoReps: "10–12 reps",
        focus: "Go heavier. Strength phase begins. Numbers jump noticeably."
    },
    {
        week: "W 7–8",
        setsReps: "5 × 5",
        isoReps: "10–12 reps",
        focus: "Peak strength phase. Max heavy lifting. Best gains of the 12 weeks."
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
        focus: "Test your 1-rep max on all compound lifts."
    }
];

export const RESULTS_TIMELINE = [
    {
        time: "Month 1",
        result: "Strength jumps fast — nervous system learning. Mirror looks the same. Normal."
    },
    {
        time: "Month 2",
        result: "People notice. Chest and shoulders show first. Forearms start looking more defined."
    },
    {
        time: "Month 3",
        result: "Arms measurably bigger. Back 3D. Forearms noticeably thicker from the brachioradialis."
    },
    {
        time: "Month 6",
        result: "Unrecognisable from starting photos. 5–6 kg actual muscle. Forearms no longer a concern."
    },
    {
        time: "Month 12",
        result: "8–12 kg of muscle. At your body fat, every kg is visible. Forearms match the rest."
    }
];

export const FOREARM_PROTOCOL_INFO = {
    title: "FOREARM GUIDE — THE FULL BREAKDOWN",
    truth: "Forearms are the most genetically determined muscle group. Muscle belly length and insertions are largely fixed. BUT the brachioradialis — the thick muscle on top of your forearm — DOES grow significantly with training. Wrist flexors and extensors add measurable thickness too. Expect real results in 4–6 months of consistent direct work. Not 4 weeks.",
    targets: [
        {
            muscle: "Brachioradialis",
            where: "Top of forearm — most visible",
            exercise: "Reverse Curl, Hammer Curl",
            function: "Forearm flexion with neutral grip"
        },
        {
            muscle: "Wrist Flexors",
            where: "Inner forearm (palm side)",
            exercise: "Wrist Curl",
            function: "Curl the wrist downward"
        },
        {
            muscle: "Wrist Extensors",
            where: "Outer forearm (back of hand)",
            exercise: "Reverse Wrist Curl",
            function: "Extend the wrist upward"
        }
    ],
    bonusHack: "On your last set of every pulling exercise (rows, pulldowns, pull-ups) — hold the contraction for 2 extra seconds before releasing. This massively increases forearm time-under-tension with zero extra time added to your session. Grip strength = forearm size stimulus."
};

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
    "barbell wrist curl": "10–15 kg",
    "wrist curl": "10–15 kg",
    "reverse wrist curl": "5–10 kg",
    "farmer's walk": "16–24 kg ea",
    "dead hang": "Bodyweight (30–45 sec)",
    "cable crossover — high to low": "10–20 kg",
    "cable fly — low to high": "10–20 kg",
    "overhead cable tricep extension": "10–20 kg",
    "single arm dumbbell row": "12–20 kg ea",
    "face pulls — cable": "10–20 kg",
    "cable lateral raise": "4–8 kg ea",
    "rear delt fly — pec deck reverse": "10–20 kg",
    "rear delt fly — machine or cable": "10–20 kg",
    "hanging leg raise": "Bodyweight",
    "cable crunch": "15–25 kg",
    "leg press": "40–80 kg",
    "leg curl — lying machine": "15–30 kg",
    "leg extension": "15–30 kg",
    "standing calf raise": "20–40 kg",
    "incline barbell press": "25–45 kg",
    "weighted pull-ups": "Bodyweight (+2.5–10 kg)",
    "chest dip — weighted": "Bodyweight (+2.5–10 kg)",
    "t-bar row or chest-supported row": "20–35 kg",
    "cable fly — high to low": "10–20 kg",
    "barbell curl": "15–25 kg",
    "incline dumbbell curl": "8–12 kg ea",
    "hammer curl": "10–14 kg ea",
    "close grip bench press": "25–45 kg",
    "cable pushdown — straight bar": "15–25 kg",
    "cable pushdown — bar": "15–25 kg",
    "ab wheel rollout": "Bodyweight"
};

export const getSuggestedWeight = (exerciseName) => {
    if (!exerciseName) return "";
    return SUGGESTED_WEIGHTS[exerciseName.toLowerCase().trim()] || "";
};

