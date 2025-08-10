import { seasonSimulator, SeasonSimulator } from '@/utils/testing/seasonSimulator';

describe('SeasonSimulator', () => {
  let simulator: SeasonSimulator;

  beforeEach(() => {
    simulator = new SeasonSimulator();
  });

  describe('Simulation Mode', () => {
    it('should enable simulation mode', () => {
      simulator.setSimulationMode(true);
      expect(simulator['isSimulationMode']).toBe(true);
    });

    it('should disable simulation mode', () => {
      simulator.setSimulationMode(false);
      expect(simulator['isSimulationMode']).toBe(false);
    });
  });

  describe('Week Management', () => {
    beforeEach(() => {
      simulator.setSimulationMode(true);
    });

    it('should return current week as 1 by default', () => {
      expect(simulator.getCurrentWeek()).toBe(1);
    });

    it('should advance to next week', () => {
      const nextWeek = simulator.advanceWeek();
      expect(nextWeek).toBe(2);
      expect(simulator.getCurrentWeek()).toBe(2);
    });

    it('should not advance past week 18', () => {
      simulator.setWeek(18);
      const week = simulator.advanceWeek();
      expect(week).toBe(18);
    });

    it('should set specific week', () => {
      simulator.setWeek(10);
      expect(simulator.getCurrentWeek()).toBe(10);
    });

    it('should not set week outside valid range', () => {
      simulator.setWeek(0);
      expect(simulator.getCurrentWeek()).toBe(1);
      
      simulator.setWeek(19);
      expect(simulator.getCurrentWeek()).toBe(1);
    });
  });

  describe('Weekly Stats Generation', () => {
    beforeEach(() => {
      simulator.setSimulationMode(true);
    });

    it('should generate weekly stats for a given week', () => {
      const stats = simulator.generateWeeklyStats(1);
      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('playerId');
      expect(stats[0]).toHaveProperty('playerName');
      expect(stats[0]).toHaveProperty('week');
      expect(stats[0]).toHaveProperty('fantasyPoints');
    });

    it('should generate realistic fantasy points', () => {
      const stats = simulator.generateWeeklyStats(1);
      const qbStats = stats.find(s => s.playerName.includes('QB'));
      
      if (qbStats) {
        expect(qbStats.fantasyPoints).toBeGreaterThan(0);
        expect(qbStats.fantasyPoints).toBeLessThan(50); // Reasonable QB range
      }
    });
  });

  describe('Full Season Simulation', () => {
    it('should simulate a full season', async () => {
      simulator.setSimulationMode(true);
      const results = await simulator.simulateFullSeason('test-league-id');
      
      expect(results).toHaveLength(18);
      expect(results[0].week).toBe(1);
      expect(results[17].week).toBe(18);
      expect(results[0].stats).toBeDefined();
    });

    it('should call progress callback during simulation', async () => {
      simulator.setSimulationMode(true);
      const progressCallback = jest.fn();
      
      await simulator.simulateFullSeason('test-league-id', progressCallback);
      
      expect(progressCallback).toHaveBeenCalledTimes(18);
      expect(progressCallback).toHaveBeenCalledWith(1);
      expect(progressCallback).toHaveBeenCalledWith(18);
    });
  });
});