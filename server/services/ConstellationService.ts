import { EventEmitter } from 'events';
import { Constellation, IConstellation, StarMemory, IStarMemory } from '../database/bondModels.js';
import { PlayerData } from '../database/playerDataModel.js';
import crypto from 'crypto';

interface ConstellationFormation {
  playerIds: string[];
  starMemoryIds: string[];
  realmId: string;
  name?: string;
  description?: string;
}

interface ConstellationRewards {
  stardust: number;
  xp: number;
  cosmetic?: string;
  title?: string;
}

interface FormationResult {
  success: boolean;
  constellation?: IConstellation;
  rewards?: ConstellationRewards;
  error?: string;
}

interface ConstellationPoint {
  x: number;
  y: number;
  starMemoryId: string;
}

class ConstellationService extends EventEmitter {
  private readonly MIN_STARS_FOR_CONSTELLATION = 3;
  private readonly MAX_STARS_PER_CONSTELLATION = 20;

  private readonly RARITY_THRESHOLDS = {
    common: 3,
    rare: 5,
    epic: 8,
    legendary: 12
  };

  private readonly RARITY_REWARDS: Record<string, ConstellationRewards> = {
    common: { stardust: 100, xp: 50 },
    rare: { stardust: 300, xp: 150 },
    epic: { stardust: 750, xp: 400, cosmetic: 'constellation_glow_epic' },
    legendary: { stardust: 2000, xp: 1000, cosmetic: 'constellation_aura_legendary', title: 'Starweaver' }
  };

  private readonly CONSTELLATION_NAMES = {
    prefixes: ['Luminous', 'Eternal', 'Sacred', 'Celestial', 'Ancient', 'Radiant', 'Mystic', 'Divine'],
    suffixes: ['Bond', 'Unity', 'Harmony', 'Light', 'Star', 'Dream', 'Nexus', 'Circle']
  };

  async initialize(): Promise<void> {
    console.log('⭐ Constellation Service initialized');
  }

  // ==========================================
  // Constellation Formation
  // ==========================================

  async formConstellation(formation: ConstellationFormation): Promise<FormationResult> {
    try {
      // Validate minimum star count
      if (formation.starMemoryIds.length < this.MIN_STARS_FOR_CONSTELLATION) {
        return {
          success: false,
          error: `Need at least ${this.MIN_STARS_FOR_CONSTELLATION} sealed bonds to form constellation`
        };
      }

      if (formation.starMemoryIds.length > this.MAX_STARS_PER_CONSTELLATION) {
        return {
          success: false,
          error: `Cannot exceed ${this.MAX_STARS_PER_CONSTELLATION} stars per constellation`
        };
      }

      // Fetch and validate star memories
      const starMemories = await StarMemory.find({
        _id: { $in: formation.starMemoryIds }
      });

      if (starMemories.length !== formation.starMemoryIds.length) {
        return { success: false, error: 'Some star memories not found' };
      }

      // Check if any star memories are already in a constellation
      const alreadyUsed = starMemories.filter(sm => sm.constellation);
      if (alreadyUsed.length > 0) {
        return { success: false, error: 'Some star memories are already part of a constellation' };
      }

      // Verify all players are represented in the star memories
      const involvedPlayers = new Set<string>();
      starMemories.forEach(sm => {
        involvedPlayers.add(sm.player1Id);
        involvedPlayers.add(sm.player2Id);
      });

      for (const playerId of formation.playerIds) {
        if (!involvedPlayers.has(playerId)) {
          return { success: false, error: 'Player not part of these star memories' };
        }
      }

      // Determine rarity based on star count
      const rarity = this.calculateRarity(starMemories.length);
      const rewards = this.RARITY_REWARDS[rarity];

      // Calculate constellation shape
      const shape = this.calculateShape(starMemories);

      // Determine bonus type
      const bonusType = this.determineBonusType(starMemories);

      // Generate name if not provided
      const name = formation.name || this.generateConstellationName();

      // Create constellation
      const constellation = new Constellation({
        name,
        description: formation.description || `A constellation formed by ${formation.playerIds.length} souls`,
        playerIds: formation.playerIds,
        starMemoryIds: formation.starMemoryIds,
        realmId: formation.realmId,
        shape,
        bonusType,
        bonusAmount: rewards.stardust,
        rarity,
        formedAt: new Date()
      });

      await constellation.save();

      // Update star memories to reference constellation
      await StarMemory.updateMany(
        { _id: { $in: formation.starMemoryIds } },
        { $set: { constellation: constellation._id.toString() } }
      );

      // Distribute rewards to all players
      await this.distributeRewards(formation.playerIds, rewards, constellation._id.toString());

      this.emit('constellation_formed', {
        constellation,
        playerIds: formation.playerIds,
        rarity,
        rewards
      });

      return {
        success: true,
        constellation,
        rewards
      };
    } catch (error) {
      console.error('Error forming constellation:', error);
      return { success: false, error: 'Failed to form constellation' };
    }
  }

  async expandConstellation(constellationId: string, newStarMemoryIds: string[]): Promise<FormationResult> {
    try {
      const constellation = await Constellation.findById(constellationId);
      if (!constellation) {
        return { success: false, error: 'Constellation not found' };
      }

      if (constellation.starMemoryIds.length + newStarMemoryIds.length > this.MAX_STARS_PER_CONSTELLATION) {
        return { success: false, error: `Cannot exceed ${this.MAX_STARS_PER_CONSTELLATION} stars per constellation` };
      }

      // Validate New Memories
      const newMemories = await StarMemory.find({ _id: { $in: newStarMemoryIds } });
      if (newMemories.length !== newStarMemoryIds.length) {
        return { success: false, error: 'Some star memories not found' };
      }

      // Check if used
      const alreadyUsed = newMemories.filter(sm => sm.constellation);
      if (alreadyUsed.length > 0) {
        return { success: false, error: 'Some star memories are already part of a constellation' };
      }

      // Check connectivity: At least one player in the new memories must already be in the constellation
      // Actually, strictly speaking, a Star Memory connects Player A and Player B.
      // For it to be added to the constellation, at least one of them should be a member?
      // Or do we just allow any disjoint set? No, it should be connected.
      const currentMembers = new Set(constellation.playerIds);
      const newPlayers = new Set<string>();
      let isConnected = false;

      newMemories.forEach(sm => {
        if (currentMembers.has(sm.player1Id) || currentMembers.has(sm.player2Id)) {
          isConnected = true;
        }
        newPlayers.add(sm.player1Id);
        newPlayers.add(sm.player2Id);
      });

      if (!isConnected && constellation.playerIds.length > 0) {
        return { success: false, error: 'New stars must be connected to at least one existing member' };
      }

      // Update Constellation
      const allPlayers = new Set([...constellation.playerIds, ...Array.from(newPlayers)]);
      const allStars = [...constellation.starMemoryIds, ...newStarMemoryIds];

      // Recalculate Rarity & Shape
      const newRarity = this.calculateRarity(allStars.length);
      const fullStarMemories = await StarMemory.find({ _id: { $in: allStars } });
      const newShape = this.calculateShape(fullStarMemories);

      // Update DB
      const result = await Constellation.findByIdAndUpdate(
        constellationId,
        {
          $set: {
            playerIds: Array.from(allPlayers),
            starMemoryIds: allStars,
            rarity: newRarity,
            shape: newShape
          }
        },
        { new: true }
      );

      // Link Stars
      await StarMemory.updateMany(
        { _id: { $in: newStarMemoryIds } },
        { $set: { constellation: constellationId } }
      );

      // Distribute Rewards (only for new stars contribution?)
      // Or maybe a smaller reward for expansion?
      // Let's give a small "Expansion Bonus"
      const expansionReward: ConstellationRewards = {
        stardust: 50 * newStarMemoryIds.length,
        xp: 25 * newStarMemoryIds.length
      };

      // Reward everyone in the expanded constellation? Or just the new contributors?
      // Let's reward everyone to encourage growth!
      await this.distributeRewards(Array.from(allPlayers), expansionReward, constellationId);

      this.emit('constellation_expanded', {
        constellation: result,
        newMembers: Array.from(newPlayers).filter(id => !constellation.playerIds.includes(id)),
        rewards: expansionReward
      });

      return {
        success: true,
        constellation: result as IConstellation,
        rewards: expansionReward
      };

    } catch (error) {
      console.error('Error expanding constellation:', error);
      return { success: false, error: 'Failed to expand constellation' };
    }
  }

  // ==========================================
  // Queries
  // ==========================================

  async getPlayerConstellations(playerId: string): Promise<IConstellation[]> {
    return Constellation.find({ playerIds: playerId }).sort({ formedAt: -1 });
  }

  async getConstellation(constellationId: string): Promise<IConstellation | null> {
    return Constellation.findById(constellationId);
  }

  async getConstellationByName(name: string): Promise<IConstellation | null> {
    return Constellation.findOne({ name });
  }

  async getRealmConstellations(realmId: string, limit: number = 50): Promise<IConstellation[]> {
    return Constellation.find({ realmId })
      .sort({ formedAt: -1 })
      .limit(limit);
  }

  async getConstellationWithStars(constellationId: string): Promise<{
    constellation: IConstellation | null;
    starMemories: IStarMemory[];
  }> {
    const constellation = await Constellation.findById(constellationId);
    if (!constellation) {
      return { constellation: null, starMemories: [] };
    }

    const starMemories = await StarMemory.find({
      _id: { $in: constellation.starMemoryIds }
    });

    return { constellation, starMemories };
  }

  async getPlayerConstellationStats(playerId: string): Promise<{
    total: number;
    byRarity: Record<string, number>;
    totalStarsUsed: number;
    uniquePartners: number;
  }> {
    const constellations = await this.getPlayerConstellations(playerId);

    const stats = {
      total: constellations.length,
      byRarity: {} as Record<string, number>,
      totalStarsUsed: 0,
      uniquePartners: new Set<string>()
    };

    constellations.forEach(c => {
      stats.byRarity[c.rarity] = (stats.byRarity[c.rarity] || 0) + 1;
      stats.totalStarsUsed += c.starMemoryIds.length;

      c.playerIds.forEach(pid => {
        if (pid !== playerId) {
          stats.uniquePartners.add(pid);
        }
      });
    });

    return {
      ...stats,
      uniquePartners: stats.uniquePartners.size
    };
  }

  // ==========================================
  // Constellation Discovery
  // ==========================================

  async checkForPotentialConstellations(playerId: string): Promise<Array<{
    starMemoryIds: string[];
    playerIds: string[];
    suggestedRarity: string;
  }>> {
    // Get all star memories involving this player that aren't in constellations
    const starMemories = await StarMemory.find({
      $or: [{ player1Id: playerId }, { player2Id: playerId }],
      constellation: { $exists: false }
    });

    if (starMemories.length < this.MIN_STARS_FOR_CONSTELLATION) {
      return [];
    }

    // Identify all unique players involved in these memories
    const connectedPlayerIds = new Set<string>();
    connectedPlayerIds.add(playerId);

    starMemories.forEach(sm => {
      connectedPlayerIds.add(sm.player1Id);
      connectedPlayerIds.add(sm.player2Id);
    });

    // Create a single "Potential Constellation" containing ALL available stars
    // This allows the user to form a "Hub" constellation or a "Cluster"
    // Future improvement: Allow selecting subsets, but for now, auto-group all eligible stars

    const potentialConstellation = {
      starMemoryIds: starMemories.map(m => m._id.toString()),
      playerIds: Array.from(connectedPlayerIds),
      suggestedRarity: this.calculateRarity(starMemories.length)
    };

    return [potentialConstellation];
  }

  // ==========================================
  // Private Methods
  // ==========================================

  private calculateRarity(starCount: number): 'common' | 'rare' | 'epic' | 'legendary' {
    if (starCount >= this.RARITY_THRESHOLDS.legendary) return 'legendary';
    if (starCount >= this.RARITY_THRESHOLDS.epic) return 'epic';
    if (starCount >= this.RARITY_THRESHOLDS.rare) return 'rare';
    return 'common';
  }

  private calculateShape(starMemories: IStarMemory[]): Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> {
    const shape: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];

    // Get positions from star memories
    const positions: ConstellationPoint[] = starMemories
      .filter(sm => sm.position)
      .map(sm => ({
        x: sm.position!.x,
        y: sm.position!.y,
        starMemoryId: sm._id.toString()
      }));

    if (positions.length < 2) return shape;

    // Create connections between adjacent stars (simple sequential connection)
    for (let i = 0; i < positions.length - 1; i++) {
      shape.push({
        from: { x: positions[i].x, y: positions[i].y },
        to: { x: positions[i + 1].x, y: positions[i + 1].y }
      });
    }

    // Close the constellation loop if more than 3 stars
    if (positions.length > 2) {
      shape.push({
        from: { x: positions[positions.length - 1].x, y: positions[positions.length - 1].y },
        to: { x: positions[0].x, y: positions[0].y }
      });
    }

    return shape;
  }

  private determineBonusType(starMemories: IStarMemory[]): string {
    // Analyze bond levels to determine bonus type
    const bondLevelSum = starMemories.reduce((sum, sm) => sum + ((sm as any).bondLevel || 0), 0);
    const avgBondLevel = bondLevelSum / starMemories.length;

    if (avgBondLevel >= 8) return 'xp_boost';
    if (avgBondLevel >= 5) return 'stardust_boost';
    return 'bond_boost';
  }

  private generateConstellationName(): string {
    const prefix = this.CONSTELLATION_NAMES.prefixes[
      Math.floor(Math.random() * this.CONSTELLATION_NAMES.prefixes.length)
    ];
    const suffix = this.CONSTELLATION_NAMES.suffixes[
      Math.floor(Math.random() * this.CONSTELLATION_NAMES.suffixes.length)
    ];
    return `${prefix} ${suffix}`;
  }

  private async distributeRewards(
    playerIds: string[],
    rewards: ConstellationRewards,
    constellationId: string
  ): Promise<void> {
    for (const playerId of playerIds) {
      const player = await PlayerData.findOne({ playerId });
      if (!player) continue;

      // Grant stardust
      player.stardust = (player.stardust || 0) + rewards.stardust;

      // Grant XP
      player.xp = (player.xp || 0) + rewards.xp;

      // Grant cosmetic if applicable
      if (rewards.cosmetic) {
        if (!player.cosmetics.ownedItems.includes(rewards.cosmetic)) {
          player.cosmetics.ownedItems.push(rewards.cosmetic);
        }
      }

      await player.save();

      this.emit('reward_distributed', {
        playerId,
        constellationId,
        rewards
      });
    }
  }

  // ==========================================
  // Admin Functions
  // ==========================================

  async deleteConstellation(constellationId: string): Promise<boolean> {
    const constellation = await Constellation.findById(constellationId);
    if (!constellation) return false;

    // Remove constellation reference from star memories
    await StarMemory.updateMany(
      { constellation: constellationId },
      { $unset: { constellation: 1 } }
    );

    await Constellation.deleteOne({ _id: constellationId });

    this.emit('constellation_deleted', { constellationId });
    return true;
  }

  async getGlobalConstellationStats(): Promise<{
    total: number;
    byRarity: Record<string, number>;
    byRealm: Record<string, number>;
    averageStars: number;
  }> {
    const constellations = await Constellation.find();

    const stats = {
      total: constellations.length,
      byRarity: {} as Record<string, number>,
      byRealm: {} as Record<string, number>,
      totalStars: 0
    };

    constellations.forEach(c => {
      stats.byRarity[c.rarity] = (stats.byRarity[c.rarity] || 0) + 1;
      stats.byRealm[c.realmId] = (stats.byRealm[c.realmId] || 0) + 1;
      stats.totalStars += c.starMemoryIds.length;
    });

    return {
      ...stats,
      averageStars: stats.total > 0 ? stats.totalStars / stats.total : 0
    };
  }
}

export const constellationService = new ConstellationService();
export { ConstellationService };
