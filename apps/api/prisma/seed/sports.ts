/** Sport / discipline catalog for programs. `id` is the slug; the same rows are inserted by the periodization migration. */
export interface SportSeed {
  id: string;
  name: string;
  group: string;
}

const sport = (group: string, names: readonly string[]): SportSeed[] =>
  names.map((name) => ({ id: name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, group }));

export const SPORTS: readonly SportSeed[] = [
  ...sport('Strength', ['Powerlifting', 'Olympic Weightlifting', 'Bodybuilding', 'Powerbuilding', 'Strongman', 'CrossFit', 'Functional Fitness', 'General Strength', 'Hypertrophy', 'Calisthenics', 'Kettlebell Sport']),
  ...sport('Field', ['American Football', 'Rugby Union', 'Rugby League', 'Soccer', 'Baseball', 'Softball', 'Lacrosse', 'Field Hockey', 'Cricket', 'Australian Rules Football', 'Ultimate Frisbee']),
  ...sport('Court', ['Basketball', 'Volleyball', 'Tennis', 'Badminton', 'Squash', 'Pickleball', 'Netball', 'Handball', 'Table Tennis']),
  ...sport('Combat', ['Boxing', 'Muay Thai', 'Brazilian Jiu-Jitsu', 'Judo', 'Wrestling', 'Mixed Martial Arts', 'Taekwondo', 'Karate', 'Kickboxing', 'Fencing']),
  ...sport('Endurance', ['Marathon', 'Half Marathon', 'Triathlon', 'Cycling', 'Swimming', 'Rowing', 'Trail Running', 'Ultra Running', 'Sprinting', 'Middle Distance Running', 'Race Walking']),
  ...sport('Track & Field', ['Shot Put', 'Discus', 'Javelin', 'Hammer Throw', 'High Jump', 'Long Jump', 'Pole Vault', 'Hurdles', 'Decathlon']),
  ...sport('Outdoor', ['Rock Climbing', 'Bouldering', 'Alpine Skiing', 'Snowboarding', 'Cross-Country Skiing', 'Surfing', 'Mountaineering', 'Obstacle Course Racing']),
  ...sport('Other', ['Golf', 'Ice Hockey', 'Gymnastics', 'Cheerleading', 'Dance', 'Equestrian', 'Skateboarding', 'Tactical / Military', 'Firefighter', 'Rehabilitation', 'Healthy Aging', 'General Fitness']),
];
