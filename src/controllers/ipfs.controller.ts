import { Request, Response } from 'express';
import { z } from 'zod';
import { PinataService } from '../services/pinata.service';
import { PinataMetadata, PinataOptions } from '../types/pinata.types';
import { asyncHandler } from '../middleware/error.middleware';
import { AppError } from '../types/error.types';

const pinataService = new PinataService();

// Validation schemas
const metadataSchema = z.object({
    name: z.string().optional(),
    keyvalues: z.record(z.string()).optional(),
});

const optionsSchema = z.object({
    cidVersion: z.union([z.literal(0), z.literal(1)]).optional(),
    wrapWithDirectory: z.boolean().optional(),
}).optional();

export const ipfsController = {
    // Pin JSON to IPFS
    pinJSON: asyncHandler(async (req: Request, res: Response) => {
        const { json, metadata, options } = req.body;

        if (!json || typeof json !== 'object') {
            throw new AppError('Invalid JSON data provided', 400);
        }

        // Ensure metadata is properly typed as PinataMetadata
        let validatedMetadata: PinataMetadata = { name: 'Untitled' };
        
        if (metadata) {
            // Handle if metadata is a string (parse it)
            if (typeof metadata === 'string') {
                try {
                    const parsedMetadata = JSON.parse(metadata);
                    validatedMetadata = {
                        name: parsedMetadata.name || 'Untitled',
                        keyvalues: parsedMetadata.keyvalues
                    };
                } catch (error) {
                    throw new AppError('Invalid metadata format', 400);
                }
            } else if (typeof metadata === 'object') {
                validatedMetadata = {
                    name: metadata.name || 'Untitled',
                    keyvalues: metadata.keyvalues
                };
            } else {
                throw new AppError('Invalid metadata format', 400);
            }
        }

        // Create a proper PinataOptions object
        const validatedOptions: PinataOptions = options 
            ? {
                cidVersion: options.cidVersion,
                wrapWithDirectory: options.wrapWithDirectory
              }
            : {};

        const result = await pinataService.pinJSONToIPFS(
            json,
            validatedMetadata,
            validatedOptions
        );

        res.status(201).json({
            status: 'success',
            data: result
        });
    }),

    // Pin File to IPFS
    pinFile: asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new AppError('No file provided', 400);
        }

        // Ensure metadata is properly typed as PinataMetadata
        let validatedMetadata: PinataMetadata = { name: req.file.originalname || 'file' };
        
        if (req.body.metadata) {
            // Handle if metadata is a string (parse it)
            if (typeof req.body.metadata === 'string') {
                try {
                    const parsedMetadata = JSON.parse(req.body.metadata);
                    validatedMetadata = {
                        name: parsedMetadata.name || req.file.originalname || 'file',
                        keyvalues: parsedMetadata.keyvalues
                    };
                } catch (error) {
                    throw new AppError('Invalid metadata format', 400);
                }
            } else if (typeof req.body.metadata === 'object') {
                validatedMetadata = {
                    name: req.body.metadata.name || req.file.originalname || 'file',
                    keyvalues: req.body.metadata.keyvalues
                };
            } else {
                throw new AppError('Invalid metadata format', 400);
            }
        }

        // Handle options
        let validatedOptions: PinataOptions = {};
        
        if (req.body.options) {
            if (typeof req.body.options === 'string') {
                try {
                    const parsedOptions = JSON.parse(req.body.options);
                    validatedOptions = {
                        cidVersion: parsedOptions.cidVersion,
                        wrapWithDirectory: parsedOptions.wrapWithDirectory
                    };
                } catch (error) {
                    throw new AppError('Invalid options format', 400);
                }
            } else if (typeof req.body.options === 'object') {
                validatedOptions = {
                    cidVersion: req.body.options.cidVersion,
                    wrapWithDirectory: req.body.options.wrapWithDirectory
                };
            }
        }

        const result = await pinataService.pinFileToIPFS(
            req.file.buffer,
            validatedMetadata,
            validatedOptions
        );

        res.status(201).json({
            status: 'success',
            data: result
        });
    }),

    // Get Pin List
    getPinList: asyncHandler(async (req: Request, res: Response) => {
        const result = await pinataService.getPinList();
        res.status(200).json({
            status: 'success',
            data: result
        });
    }),

    // Unpin from IPFS
    unpin: asyncHandler(async (req: Request, res: Response) => {
        const { hash } = req.params;

        if (!hash) {
            throw new AppError('IPFS hash is required', 400);
        }

        await pinataService.unpin(hash);
        res.status(200).json({
            status: 'success',
            message: 'Content unpinned successfully'
        });
    })
}; 