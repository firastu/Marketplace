import { IntersectionType } from "@nestjs/swagger";
import { SearchListingsDto } from "./search-listings.dto";
import { PaginationDto } from "../../../common";

export class GetListingsQueryDto extends IntersectionType(
  SearchListingsDto,
  PaginationDto,
) {}
