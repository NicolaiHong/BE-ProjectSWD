import { Response } from "express";

// Standard REST API response structure
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
  errors?: any;
  _links?: Links;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Links {
  self?: string;
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
  [key: string]: string | undefined;
}

export class ApiResponseHelper {
  /**
   * Success response (200 OK)
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = "Success",
    links?: Links,
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };

    if (links) {
      response._links = links;
    }

    return res.status(200).json(response);
  }

  /**
   * Created response (201 Created)
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = "Resource created successfully",
    links?: Links,
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };

    if (links) {
      response._links = links;
    }

    return res.status(201).json(response);
  }

  /**
   * No content response (204 No Content)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Paginated response (200 OK with pagination)
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message: string = "Success",
    baseUrl?: string,
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      pagination,
    };

    // Add pagination links if baseUrl is provided
    if (baseUrl) {
      const links: Links = {
        self: `${baseUrl}?page=${pagination.page}&limit=${pagination.limit}`,
      };

      if (pagination.hasNext) {
        links.next = `${baseUrl}?page=${pagination.page + 1}&limit=${pagination.limit}`;
      }

      if (pagination.hasPrev) {
        links.prev = `${baseUrl}?page=${pagination.page - 1}&limit=${pagination.limit}`;
      }

      links.first = `${baseUrl}?page=1&limit=${pagination.limit}`;
      links.last = `${baseUrl}?page=${pagination.totalPages}&limit=${pagination.limit}`;

      response._links = links;
    }

    return res.status(200).json(response);
  }

  /**
   * Error response
   */
  static error(
    res: Response,
    statusCode: number,
    message: string,
    errors?: any,
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }
}

/**
 * Helper to calculate pagination metadata
 */
export const calculatePagination = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Helper to parse pagination query params
 */
export const parsePaginationParams = (
  query: any,
): { page: number; limit: number; offset: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};
