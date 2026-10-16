// Semantic bindings keep locomotion independent of generated IDs and object labels.
export const HUMANOID_BONES=['root','spine','left_hip','left_knee','left_ankle','left_shoulder','left_elbow','right_hip','right_knee','right_ankle','right_shoulder','right_elbow'] as const;
export type HumanoidBone=typeof HUMANOID_BONES[number];
export const BONE_PARENT:Record<HumanoidBone,HumanoidBone|null>={root:null,spine:'root',left_hip:'root',left_knee:'left_hip',left_ankle:'left_knee',left_shoulder:'spine',left_elbow:'left_shoulder',right_hip:'root',right_knee:'right_hip',right_ankle:'right_knee',right_shoulder:'spine',right_elbow:'right_shoulder'};
