import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { AnalyzeMealImageDto } from './dto/analyze-meal-image.dto';

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
    constructor(private readonly mealsService: MealsService) { }

    @Post()
    async create(@Req() req: any, @Body() dto: CreateMealDto) {
        return this.mealsService.create(req.user.userId, dto);
    }

    /** Öğün sohbeti: yemek fotoğrafı → Gemini ile dil-duyarlı metin açıklaması */
    @Post('analyze-image')
    async analyzeMealImage(@Body() dto: AnalyzeMealImageDto) {
        return this.mealsService.analyzeMealImage(dto);
    }

    @Get()
    async findAll(
        @Req() req: any,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.mealsService.findAllByUser(req.user.userId, dateFrom, dateTo);
    }

    @Get('today')
    async findToday(@Req() req: any) {
        return this.mealsService.findTodayByUser(req.user.userId);
    }

    @Get(':id')
    async findOne(@Req() req: any, @Param('id') id: string) {
        return this.mealsService.findOne(id, req.user.userId);
    }

    @Patch(':id')
    async update(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateMealDto,
    ) {
        return this.mealsService.update(id, req.user.userId, dto);
    }

    @Delete(':id')
    async remove(@Req() req: any, @Param('id') id: string) {
        await this.mealsService.remove(id, req.user.userId);
        return { message: 'Yemek silindi' };
    }
}
