import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { CoachNutritionController, FoodsController, MeNutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';

@Module({
  imports: [ClientsModule],
  controllers: [FoodsController, MeNutritionController, CoachNutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
